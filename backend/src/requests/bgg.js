/******************************************************************************/


import { BGGLookupError } from '../db/exceptions.js';
import { success, fail } from "./common.js";

import { lookupBGGGame } from '../db/bgg.js';


/******************************************************************************/


/* Input:
 *   bggGameId as a request path parameter which represents a BGG Game ID
 *
 * This will look up the board game in the BoardGameGeek API for the game ID
 * that is given, and will return back a JSON encoded version of the data for
 * that game.
 *
 * This includes the core information on the game, as well as additional info
 * such as the list of designers, artists, and so on. */
export async function lookupBGGGameInfo(ctx) {
  const { bggGameId } = ctx.req.param();

  // Try to get the game data; if this returns NULL it means that there is no
  // such game (or BGG has some other error but they use human readable text
  // for those, so we just assume they're all the same error).
  const gameInfo = await lookupBGGGame(bggGameId);
  if (gameInfo === null) {
    return fail(ctx, `BGG has no record of game with ID ${bggGameId}`, 404);
  }

  // The record seems valid, so parse it out and return back the result.
  return success(ctx, `information on BGG game ${bggGameId}`, gameInfo);
}


/******************************************************************************/
