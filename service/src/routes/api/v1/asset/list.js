/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';

import { dbGameLookup } from "#db/game";
import { dGameAssetList } from "#db/asset";


/******************************************************************************/

/* Handle a request to find either the list of all available assets, or just
 * those assets associated with a specific game.
 *
 * This can optionally handle routes which contain an idOrSlug parameter to
 * contrain the list to a specific game rather than an entire list. */
export async function handler(ctx) {
  // Our request supports looking up both assets for a specific game as well as
  // all assets; assume no game for the time being.
  let gameInfo = null;

  // If there are any parameters on the URL, the caller is specifying a game Id,
  // so try to look up the game.
  if (ctx.req.valid('param') !== undefined) {
    // Grab the slug out of the URL.
    const { idOrSlug } = ctx.req.valid('param');

    // Validate that the game given exists.
    gameInfo = await dbGameLookup(ctx, idOrSlug);
    if (gameInfo === null) {
      return fail(ctx, `no such game ${idOrSlug}`, 404)
    }
  }

  // Grab the assets requested, which may or may not be for a specific game.
  const assets = await dGameAssetList(ctx, gameInfo?.id);
  return success(ctx, `found ${assets.length} asset(s)`, assets);
}

/******************************************************************************/


/* Handle a request to find the assets for all games that have assets. */
export const $get = routeHandler(
  handler
);


/******************************************************************************/