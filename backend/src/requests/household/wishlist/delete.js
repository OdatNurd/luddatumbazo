/******************************************************************************/


import { success, fail } from '#requests/common';


import { getHouseholdDetails, removeGameFromWishlist } from '#db/household';
import { getGameDetails, getGameNames } from '#db/game';


/******************************************************************************/


/* Given information on a game, attempt to remove that game from the wishlist
 * of a specific household.  */
export async function householdWishlistDeleteReq(ctx) {
  const { idOrSlug } = ctx.req.valid('param');
  const { game } = ctx.req.valid('json');

  // Try to find the household we want to remove the game from.
  const householdInfo = await getHouseholdDetails(ctx, idOrSlug);
  if (householdInfo === null) {
    return fail(ctx, `unable to locate household with id ${idOrSlug}`, 404);
  }

  // Look up and validate the game that was specified in the request.
  const gameInfo = await getGameDetails(ctx, game, householdInfo.id);
  if (gameInfo === null) {
    return fail(ctx, `unable to locate game with id ${game}`, 404);
  }

  // If this game is not already owned, then there is nothing else that needs to
  // be done.
  if (gameInfo.wishlist === undefined) {
    return fail(ctx, `game ${gameInfo.slug} is not wishlisted by ${householdInfo.slug}`, 400);
  }

  const result = await removeGameFromWishlist(ctx, householdInfo.id, gameInfo.id);
  return success(ctx, `removed ${gameInfo.slug} from the wishlist for ${householdInfo.slug}`);
}


/******************************************************************************/
