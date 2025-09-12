/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { WishlistContentsIDSchema } from '#schema/wishlist';

import { dbHouseholdDetails } from '#db/household';
import { dbWishlistDetails } from '#db/wishlist';
import { dbGameWishlist } from '#db/game';


/******************************************************************************/


/* Given an identifier or slug for a household, validate that the household
 * exists, and then return back a (potentially empty) list of games that is
 * wish for by that household. */
export const $get = routeHandler(
  validateZod('param', WishlistContentsIDSchema),

  async (ctx) => {
    const { householdIdOrSlug, wishlistIdOrSlug } = ctx.req.valid('param');

    // Try to find the household in question
    const household = await dbHouseholdDetails(ctx, householdIdOrSlug);
    if (household === null) {
      return fail(ctx, `unable to locate household with id ${householdIdOrSlug}`, 404);
    }

    // Try to find a wishlist using this id for this household; if it exists, we
    // should complain right away.
    let wishlist = await dbWishlistDetails(ctx, household.id, wishlistIdOrSlug);
    if (wishlist === null) {
      return fail(ctx, `unable to locate wishlist with id ${wishlistIdOrSlug} in household ${householdIdOrSlug}`, 404);
    }

    // Get the games associated with this household and wishlist, if any.
    const result = await dbGameWishlist(ctx, household.id, wishlist.id);
    return success(ctx, `found ${result.length} games for ${wishlistIdOrSlug} in household ${householdIdOrSlug}`, result);
  }
);


/******************************************************************************/
