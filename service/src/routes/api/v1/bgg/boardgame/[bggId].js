/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { BGGGameIDSchema } from '#schema/bgg';

import { bggLookupGame } from '#lib/bgg';


/******************************************************************************/


/* Input:
 *   bggId as a request path parameter which represents a BGG Game ID
 *
 * This will look up the board game in the BoardGameGeek API for the game ID
 * that is given, and will return back a JSON encoded version of the data for
 * that game.
 *
 * This includes the core information on the game, as well as additional info
 * such as the list of designers, artists, and so on. */
export const $get = routeHandler(
  validateZod('param', BGGGameIDSchema),

  async (ctx) => {
    const { bggId } = ctx.req.valid('param');

    // Try to get the game data; if this returns NULL it means that there is no
    // such game (or BGG has some other error but they use human readable text
    // for those, so we just assume they're all the same error).
    const gameInfo = await bggLookupGame(bggId);
    if (gameInfo === null) {
      return fail(ctx, `BGG has no record of game with ID ${bggId}`, 404);
    }

    // The record seems valid, so parse it out and return back the result.
    return success(ctx, `information on BGG game ${bggId}`, gameInfo);
  }
);


/******************************************************************************/