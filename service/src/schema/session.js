/******************************************************************************/


import { z } from 'zod';

import { asNumber, numberOrString } from '#schema/common';


/******************************************************************************/


/* The play types a session can record. Kept here so the write schema and the
 * list filters cannot drift apart as values are added. */
export const sessionPlayTypes = [
  'cardboard',
  'boardgamearena',
  'steam',
  'gog',
  'android'
];


/******************************************************************************/


/* Queries that manipulate specific sessions or get their details must provide
 * a valid numeric sessionId as a part of the request. */
export const SessionIDSchema = z.object({
  sessionId: z.string().optional().transform(asNumber(true))
});


/******************************************************************************/


/* Parse a comma separated list (or repeated query values) of player keys.
 *
 * The accepted form is the stable key used by the list response: `u:<id>` for a
 * user and `g:<id>` for a guest. Duplicates collapse so that `match=all` counts
 * identities rather than repeated query values. */
const PlayerFilterSchema = z.union([
  z.string().default(''),
  z.array(z.string()).default([])
])
  .transform(value => (Array.isArray(value) ? value : value.split(','))
    .map(entry => entry.trim())
    .filter(entry => entry !== ''))
  .pipe(z.array(z.string().regex(/^[ug]:\d+$/)))
  .transform(keys => {
    const unique = [...new Set(keys)];

    return {
      keys: unique,
      users: unique.filter(key => key.startsWith('u:')).map(key => Number(key.slice(2))),
      guests: unique.filter(key => key.startsWith('g:')).map(key => Number(key.slice(2)))
    };
  });


/******************************************************************************/


/* Updated session reports can adjust a few of the values in the session to
 * "Close" it; the core details, such as the game played or the people that
 * did the playing are static once they are entered. To adjust those, you need
 * to delete and then re-create the session. */
export const SessionListParamSchema = z.object({
  // The presence of this key with any value is true, anything else is false
  reverse: z.any().optional().transform((value, zCtx) => value !== undefined),

  // Limit the list to open or closed reports. An omitted value means both.
  status: z.enum(['open', 'closed']).optional(),

  // Limit the list to sessions that include the given players. The keys are
  // stable identities from the list response, so a user and a guest with the
  // same display name remain distinct.
  players: PlayerFilterSchema,

  // Whether a session must include any or all of the selected players. The
  // value is only meaningful when players were selected; an omitted value is
  // the more restrictive "all".
  match: z.enum(['any', 'all']).default('all'),

  // Limit the list to sessions in any household the current user belongs to.
  // This is personalization, not an access-control gate; the unfiltered list
  // still contains every session.
  household: z.enum(['me']).optional(),

  // Inclusive bounds on sessionBegin, supplied as ISO instants. The client
  // converts its local calendar dates to start/end of day so an evening session
  // does not fall into the next UTC day.
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),

  // Exact play type and learning-game flag.
  playType: z.enum(sessionPlayTypes).optional(),
  learning: z.enum(['true', 'false']).optional()
    .transform(value => value === undefined ? undefined : value === 'true'),

  // Optionally either a comma separated string of numbers and slugs, or an
  // array of same (by using the same parameter multiple times as one ought).
  //
  // Here we accept either a string or an array of strings, and the transform
  // will split a string into an array, and also filter the array so that all
  // numbers are numbers and not strings.
  //
  // Since this is a union and the string version has a default this parameter
  // will always end up as an empty array when it's missing.
  games: z.union([
    z.string().default(''),
    z.array(z.string()).default([])
  ]).transform((value, zCtx) => {
    // If it's not an array, turn it into one
    if (Array.isArray(value) === false) {
      value = value.split(',').map(e => e.trim()).filter(e => e !== '')
    }

    // The array will always contain strings because the data came from the
    // query string; return a version that filters to turn numbers into actual
    // numbers and not strings.
    return value.map(el => numberOrString(el));
  })
}).refine(value => {
  if (value.from === undefined || value.to === undefined) {
    return true;
  }

  return Date.parse(value.from) <= Date.parse(value.to);
}, {
  message: 'from must not be after to',
  path: ['from']
});


/******************************************************************************/


/* New session reports that are added to the system require that their data
 * conform to the following schema, or the request will fail. */
export const NewSessionReportSchema = z.object({
  // The game that the session is tracking, and an optional list of gameId
  // values for any game expansions used during the session.
  gameId: z.number(),
  expansions: z.array(
    z.number().optional(),
  ).default([]),

  // The type of game that is being played; there are a specific set of values
  // to choose from.
  playType: z.enum(sessionPlayTypes),

  // The time the session began and the time that it ended; the end time is
  // optional and can be NULL if the session is stil open
  sessionBegin: z.string().datetime(),
  sessionEnd: z.string().datetime().nullable().default(null),

  // Games marked as learning games are excluded from some statistics, such as
  // average game length or for the purposes of calculating aggregate scores,
  // since such sessions are predicated on one or more players learning how to
  // play, which skews results.
  isLearning: z.boolean(),

  // The title of the session report, and the textual descriptive content.
  title: z.string().default(''),
  content: z.string().default(''),

  // Players is an object which contains the people that played in the session;
  // this is split into Users (people with login credentials in the system) and
  // Guests (who were present in the game but do not have access). Any number of
  // each can be present in the report, though there must be at least one total
  // across both groups.
  players: z.object({
    // Users are identified solely by their userId, which must exist in the
    // system for the record to be valid.
    users: z.array(
      z.object({
        // The internal UserID of this user; must match an existing user.
        userId: z.number(),

        // Whether or not this player was the starting player, the winner, and
        // what their score was in the game.
        isStartingPlayer: z.boolean().default(false),
        isWinner: z.boolean().default(false),
        score: z.number().default(0),
      }).optional()
    ),

    // Guests are identified by a combination of their first and last names,
    // which are de-duplicated into a distinct list of people.
    guests: z.array(
      z.object({
        // The first and last name of the guest.
        firstName: z.string(),
        lastName: z.string(),

        // Whether or not this player was the starting player, the winner, and
        // what their score was in the game.
        isStartingPlayer: z.boolean().default(false),
        isWinner: z.boolean().default(false),
        score: z.number().default(0),
      }).optional()
    )
  }).refine(val => val.users.length + val.guests.length !== 0),
});


/******************************************************************************/


/* Updated session reports can adjust a few of the values in the session to
 * "Close" it; the core details, such as the game played or the people that
 * did the playing are static once they are entered. To adjust those, you need
 * to delete and then re-create the session.
 *
 * Here the values are optional and have no defaults; any that are not
 * populated will get set from the current data in the session instead. */
export const UpdateSessionReportSchema = z.object({
  // The session end time can be updated, or moved back into an open state.
  sessionEnd: z.string().datetime().nullable().optional(),

  // Games marked as learning games are excluded from some statistics, such as
  // average game length or for the purposes of calculating aggregate scores,
  // since such sessions are predicated on one or more players learning how to
  // play, which skews results.
  isLearning: z.boolean().optional(),

  // The title of the session report, and the textual descriptive content.
  title: z.string().optional(),
  content: z.string().optional(),

  // Results can be updated by stable player row id while the report is open
  // (and by the reporter after it closes). The roster itself is immutable, so
  // an update may only touch players already on this report.
  players: z.array(
    z.object({
      playerId: z.number().int(),
      isStartingPlayer: z.boolean().optional(),
      score: z.number().optional(),
      isWinner: z.boolean().optional(),
    })
  ).optional(),
});


/******************************************************************************/
