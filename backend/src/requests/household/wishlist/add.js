/******************************************************************************/


import { success, fail } from '#requests/common';


import { dbHouseholdDetails, dbHouseholdInsertWishlisted } from '#db/household';
import { dbWishlistDetails  } from '#db/wishlist';
import { dbGameDetails, dbGameNames } from '#db/game';


/******************************************************************************/


/* Given information on a game, attempt to add that game to the wishlist of
 * a specific household. This requires that we also be told which of the many
 * possible names it should take. */
export async function reqHouseholdWishlistAdd(ctx) {
  const { householdIdOrSlug, wishlistIdOrSlug } = ctx.req.valid('param');
  const { game, name, publisher } = ctx.req.valid('json');

  // Try to find the household we want to add the game to.
  const householdInfo = await dbHouseholdDetails(ctx, householdIdOrSlug);
  if (householdInfo === null) {
    return fail(ctx, `unable to locate household with id ${householdIdOrSlug}`, 404);
  }

  // Check to see if this wishlist exists for this household or not; if not,
  // then we need to bail.
  const wishlistInfo = await dbWishlistDetails(ctx, householdInfo.id, wishlistIdOrSlug);
  if (wishlistInfo === null) {
    return fail(ctx, `unable to locate wishlist with id ${wishlistIdOrSlug} in household ${householdIdOrSlug}`, 404);
  }

  // Look up and validate the game that was specified in the request.
  const gameInfo = await dbGameDetails(ctx, game, householdInfo.id);
  if (gameInfo === null) {
    return fail(ctx, `unable to locate game with id ${game}`, 404);
  }

  // If this game is already wishlisted, then there is nothing else that needs
  // to be done; this will short circut below validation, which is less
  // interesting if know we don't need to do anything anyway.
  if (gameInfo.wishlist !== undefined) {
    return fail(ctx, `game ${gameInfo.slug} is already wishlisted by ${householdInfo.slug}`, 400);
  }

  // Grab the list of names that are known for this game and verify that an
  // entry with the name that we were given appears here.
  const nameInfo = await dbGameNames(ctx, gameInfo.id);
  const nameRecord = nameInfo.find(e => e.id === name || e.name === name)
  if (nameRecord === undefined) {
    return fail(ctx, `game ${gameInfo.slug} does not have a name with ID ${name}`, 404);
  }

  const result = await dbHouseholdInsertWishlisted(ctx, householdInfo.id, wishlistInfo.id, gameInfo.id, nameRecord.id);
  return success(ctx, `added ${gameInfo.slug} to the wishlist for ${householdInfo.slug}`, result);
}


/******************************************************************************/
