/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';
import { WishlistDeleteSchema } from '#schema/wishlist';

import { householdAccess } from '#lib/household';
import { dbWishlistDetails, dbWishlistDelete } from '#db/wishlist';


/******************************************************************************/


/* Given a household and one of its wishlists, remove that wishlist.
 *
 * The root wishlist cannot be removed, and a wishlist that still contains games
 * is refused so that a delete cannot silently drop those entries. */
export const $delete = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),
  validateZod('json', WishlistDeleteSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');
    const { wishlist } = ctx.req.valid('json');

    // Resolve the household and make sure the current user belongs to it.
    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    // Try to find the wishlist in this household; if it does not exist, we
    // should complain.
    const wishlistData = await dbWishlistDetails(ctx, access.household.id, wishlist);
    if (wishlistData === null) {
      return fail(ctx, `unable to delete wishlist with id ${wishlist}; does not exist`, 404);
    }

    // The root wishlist is created with the household and must always exist.
    if (wishlistData.isRoot === true) {
      return fail(ctx, `unable to delete wishlist '${wishlistData.name}'; the default wishlist cannot be removed`, 409);
    }

    // Refuse to delete a list that still has games. The UI disables this, but
    // the API must enforce it for every caller.
    const gameCount = Number(wishlistData.gameCount ?? 0);
    if (gameCount > 0) {
      return fail(ctx, `unable to delete wishlist '${wishlistData.name}'; it still contains ${gameCount} game${gameCount === 1 ? '' : 's'}`, 409);
    }

    await dbWishlistDelete(ctx, access.household.id, wishlistData.id);
    return success(ctx, `removed wishlist '${wishlistData.name}' from ${access.household.name}`);
  }
);


/******************************************************************************/
