/******************************************************************************/


import { success, fail } from "#requests/common";

import { getGameDetails } from '#db/game';


/******************************************************************************/


/* Return back a list of all of the metadata items of the given type; this may
 * be an empty list. */
export async function gameDetailsReq(ctx) {
  // Can be either an game ID or a slug to represent a game
  const { idOrSlug } = ctx.req.valid('param');

  // Look up the game; if we don't find anything by that value, then this does
  // not exist.
  const result = await getGameDetails(ctx, idOrSlug);
  if (result === null) {
    return fail(ctx, `no such game ${idOrSlug}`, 404)
  }

  return success(ctx, `information on game ${idOrSlug}`, result);
}


/******************************************************************************/
