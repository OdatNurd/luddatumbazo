/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';

import { dbHouseholdDetails } from '#db/household';
import { dbWishlistList } from '#db/wishlist';


/******************************************************************************/


/* Given an identifier or slug for a household, validate that the household
 * exists, and then return back a (potentially empty) list of wishlists that
 * are owned by that household. */
export const $get = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');

    // Try to find the household in question
    const household = await dbHouseholdDetails(ctx, householdIdOrSlug);
    if (household === null) {
      return fail(ctx, `unable to locate household with id ${householdIdOrSlug}`, 404);
    }

    // Get the games associated with this household, if any.
    const result = await dbWishlistList(ctx, household.id);
    return success(ctx, `found ${result.length} wishlist(s) for household ${householdIdOrSlug}`, result);
  }
);


/******************************************************************************/
