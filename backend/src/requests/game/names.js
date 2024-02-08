/******************************************************************************/


import { success, fail } from '#requests/common';

import { getGameNames } from '#db/game';


/******************************************************************************/


/* Return back a list of all of the names for the given game; this cannot be an
 * empty list because every game needs at least one name.  */
export async function gameNamesReq(ctx) {
  // Can be either an game ID or a slug to represent a game
  const { idOrSlug } = ctx.req.valid('param');

  // Look up the game; if we don't find anything by that value, then this does
  // not exist.
  const result = await getGameNames(ctx, idOrSlug);
  if (result === null) {
    return fail(ctx, `no such game ${idOrSlug}`, 404)
  }

  return success(ctx, `found ${result.length} names for game ${idOrSlug}`, result);
}


/******************************************************************************/
