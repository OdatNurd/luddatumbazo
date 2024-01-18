/******************************************************************************/


import { success } from "../../common.js";

import { getExpansionDetails } from '#db/expansion';


/******************************************************************************/


/* Given a gameId for a game that exists in the database, return back an object
 * that contains two sets of (potentially empty) information:
 *   - a list of games that expand this game, if this game is a base game
 *   - a list of games that are expanded by this game, if this game is an
 *     expansion */
export async function getExpansionDetailsReq(ctx) {
  // Get the bggGameId for the game we were given
  const { gameId } = ctx.req.param();

  // Execute the request and return the result back
  const result = await getExpansionDetails(ctx, gameId);

  return success(ctx, `expansion info for game ${gameId}`, result);
}


/******************************************************************************/

