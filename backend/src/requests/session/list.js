/******************************************************************************/


import { getSessionList } from '#db/session';
import { performGameLookup } from '#db/game';
import { success  } from "../common.js";

import { z } from 'zod';


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


/* Fetch a short list of all of the session reports that are currently known to
 * the system, optionally also filtering based on gameId's for games in the
 * session.
 *
 * In the future this will provide itger various filters to control which items
 * are returned, but at time of writing (during devember) this is more
 * simplistic than that and only supports gameId filters. */
export async function sessionListReq(ctx) {
  // The query can contain a flag to tell us that we should reverse the sort,
  // and an option list of game id's and slugs to look up sessions for.
  const { reverse, games } = ctx.req.valid('query');

  // Use the list in a lookup to map it to objects that we can use to get to
  // definitive gameId values to pass in.
  //
  // TODO: This is stupid because we could check the list to see which items are
  //       numbers, and then only perform, the lookup for any that don't appear
  //       to be. However this is still a WIP, so blindly doing the dumb thing
  //       for the moment.
  const lookup = await performGameLookup(ctx, games);

  // Fetch and return the list, optionally filtering and reversing it.
  const result = await getSessionList(ctx, lookup.map(e => e.id), reverse);

  return success(ctx, `found ${result.length} session(s)`, result);
}


/******************************************************************************/
