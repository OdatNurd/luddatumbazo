/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { WishlistContentsIDSchema } from '#schema/wishlist';

import { householdAccess } from '#lib/household';
import { dbWishlistDetails } from '#db/wishlist';
import { dbGameWishlist } from '#db/game';


/******************************************************************************/


/* Given an identifier or slug for a household, validate that the household
 * exists and that the current user belongs to it, then return back a
 * (potentially empty) list of games that are wished for by that household. */
export const $get = routeHandler(
  validateZod('param', WishlistContentsIDSchema),

  async (ctx) => {
    const { householdIdOrSlug, wishlistIdOrSlug } = ctx.req.valid('param');

    // Resolve the household and make sure the current user belongs to it.
    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    // Try to find the wishlist in this household; if it does not exist, we
    // should complain right away.
    const wishlist = await dbWishlistDetails(ctx, access.household.id, wishlistIdOrSlug);
    if (wishlist === null) {
      return fail(ctx, `unable to locate wishlist with id ${wishlistIdOrSlug} in household ${householdIdOrSlug}`, 404);
    }

    // Get the games associated with this household and wishlist, if any.
    const result = await dbGameWishlist(ctx, access.household.id, wishlist.id);
    return success(ctx, `found ${result.length} games for ${wishlistIdOrSlug} in household ${householdIdOrSlug}`, result);
  }
);


/******************************************************************************/
