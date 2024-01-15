/******************************************************************************/


import { addSession, } from '../../db/session.js';
import { validate } from '../common.js';
import { success } from "../common.js";

import { z } from 'zod';


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


/* Given an object that contains the required data to insert a new session
 * report into the system, insert the required data and ship the results back.
 *
 * For details on the actual body of the object, see the addSession() call.
 *
 * This will do all updates required to insert the record for this session
 * report; an object that contains the full details of the new report (as it
 * would be returned from the details request below) is returned back. */
export async function sessionAddReq(ctx) {
  // Pull in the body of the request, which will contain the data for setting up
  // the session report.
  const sessionData = ctx.req.valid('json');

  // Add the session and return the result.
  const result = await addSession(ctx, sessionData);

  return success(ctx, `added new session report`, result);
}


/******************************************************************************/
