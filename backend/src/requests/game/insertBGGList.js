/******************************************************************************/


import { BGGLookupError } from '#db/exceptions';
import { success } from "../common.js";
import { z } from 'zod';

import { insertBGGGame } from '#db/game';


/******************************************************************************/


/* Operations to insert lists of games accept a list of BGG ID Values. */
export const BGGGameIDListSchema = z.array(z.number());


/******************************************************************************/


/* Input: a bggGameId in the URL that represents the ID of a game from
 * BoardGameGeek that we want to insert.
 *
 * This will look up the data for the game and use it to perform the insertion
 * directly.
 *
 * The result of this query is the same as adding a game by providing an
 * explicit body. */
export async function insertBGGGameListReq(ctx) {
  // Suck in the new game data and use it to do the insert; the helper
  // function does all of the validation, and will throw on error or return
  // details of the new game on success.
  const gameList = await ctx.req.valid('json');

  // Track which of the games we loop over was added and which was inserted.
  const inserted = [];
  const skipped = []
  const result = { inserted, skipped };

  // Loop over all of the BGG id's in the game list and try to insert them.
  for (const bggGameId of gameList) {
    try {
      // Try to lookup and insert this game; the result is either null if
      // there was a failure, or information on the inserted game.
      const newGameInfo = await insertBGGGame(ctx, bggGameId);
      if (newGameInfo === null) {
        skipped.push({ "bggId": bggGameId, status: 404, reason: "not found" });
      } else {
        inserted.push(newGameInfo);
      }
    }

    // If the insert threw any errors, handle them. If they are BGG lookup
    // failures, we can eat them and just skip this. Otherwise, we need to
    // re-throw so the outer handler can handle the problem for us.
    catch (err) {
      if (err instanceof BGGLookupError) {
        skipped.push({ "bggId": bggGameId, status: err.status, reason: "ID or slug already exists" });
        continue;
      }

      throw err;
    }
  }

  // Return success back.
  return success(ctx, `inserted ${inserted.length} games of ${gameList.length}`, result);
}


/******************************************************************************/
