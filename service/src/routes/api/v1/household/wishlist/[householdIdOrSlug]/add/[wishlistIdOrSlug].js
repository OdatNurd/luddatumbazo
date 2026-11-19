/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { WishlistContentsIDSchema, WishlistAddGameSchema } from '#schema/wishlist';

import { householdAccess } from '#lib/household';
import { dbHouseholdInsertWishlisted } from '#db/household';
import { dbWishlistDetails } from '#db/wishlist';
import { dbGameDetails, dbGameNames } from '#db/game';


/******************************************************************************/


/* Given information on a game, attempt to add that game to the wishlist of
 * a specific household. This requires that we also be told which of the many
 * possible names it should take. */
export const $put = routeHandler(
  validateZod('param', WishlistContentsIDSchema),
  validateZod('json', WishlistAddGameSchema),

  async (ctx) => {
    const { householdIdOrSlug, wishlistIdOrSlug } = ctx.req.valid('param');
    const { game, name } = ctx.req.valid('json');

    // Resolve the household and make sure the current user belongs to it.
    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    // Check to see if this wishlist exists for this household or not; if not,
    // then we need to bail.
    const wishlistInfo = await dbWishlistDetails(ctx, access.household.id, wishlistIdOrSlug);
    if (wishlistInfo === null) {
      return fail(ctx, `unable to locate wishlist with id ${wishlistIdOrSlug} in household ${householdIdOrSlug}`, 404);
    }

    // Look up and validate the game that was specified in the request.
    const gameInfo = await dbGameDetails(ctx, game, access.household.id);
    if (gameInfo === null) {
      return fail(ctx, `unable to locate game with id ${game}`, 404);
    }

    // If this game is already wishlisted, then there is nothing else that needs
    // to be done; this will short circuit below validation, which is less
    // interesting if we know we don't need to do anything anyway.
    if (gameInfo.wishlist !== undefined) {
      return fail(ctx, `game ${gameInfo.slug} is already wishlisted by ${access.household.slug}`, 400);
    }

    // Grab the list of names that are known for this game and verify that an
    // entry with the name that we were given appears here.
    const nameInfo = await dbGameNames(ctx, gameInfo.id);
    const nameRecord = nameInfo.find(e => e.id === name || e.name === name);
    if (nameRecord === undefined) {
      return fail(ctx, `game ${gameInfo.slug} does not have a name with ID ${name}`, 404);
    }

    const result = await dbHouseholdInsertWishlisted(ctx, access.household.id, wishlistInfo.id, gameInfo.id, nameRecord.id);
    return success(ctx, `added ${gameInfo.slug} to the wishlist for ${access.household.slug}`, result);
  }
);


/******************************************************************************/
