/******************************************************************************/


import { z } from 'zod';
import { asNumber } from '#schema/common';


/******************************************************************************/


/* Queries that manipulate specific sessions or get their details must provide
 * a valid numeric sessionId as a part of the request. */
export const SessionIDSchema = z.object({
  sessionId: z.string().optional().transform(asNumber(true))
});


/******************************************************************************/


/* Updated session reports can adjust a few of the values in the session to
 * "Close" it; the core details, such as the game played or the people that
 * did the playing are static once they are entered. To adjust those, you need
 * to delete and then re-create the session. */
export const SessionListParamSchema = z.object({
  // The presence of this key with any value is true, anything else is false
  reverse: z.any().transform((value, zCtx) => value !== undefined),

  // Optionally either a comma separated string of numbers and slugs, or an
  // array of same (by using the same parameter multiple times as one ought).
  //
  // When the value is a string, convert it into an array, so that the value is
  // always an array. Since this is a union and the string version has a default
  // this paramter will always end up as an empty array when it's missing.
  games: z.union([
    z.string().default(''),
    z.array(z.string().or(z.number())).default([])
  ]).transform((value, zCtx) => {
    // If it's not an array, turn it into one
    if (Array.isArray(value) === false) {
      value = value.split(',').map(e => e.trim()).filter(e => e !== '')
    }

    return value;
  })
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
  playType: z.enum(["cardboard", "boardgamearena", "steam", "gog", "android"]),

  // The time the session began and the time that it ended; the end time is
  // optional and can be NULL if the session is stil open
  sessionBegin: z.string().datetime(),
  sessionEnd: z.string().datetime().nullable().default(null),

  // Games marked as learning games are excluded from some statistics, such as
  // average game length or for the purposes of calculating aggregate scores,
  // since such sessions are predicated on one or more players learning how to
  // play, which skews results.
  isLearning: z.boolean(),

  // The UserId of the user that is creating the session report.
  reportingUser: z.number(),

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
    // which are deduplicated into a distinct list of people.
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
});


/******************************************************************************/