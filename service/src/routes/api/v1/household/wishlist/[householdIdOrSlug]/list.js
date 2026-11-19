/******************************************************************************/


import { routeHandler, success } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';

import { householdAccess } from '#lib/household';
import { dbWishlistList } from '#db/wishlist';


/******************************************************************************/


/* Given an identifier or slug for a household, validate that the household
 * exists and that the current user belongs to it, then return back a
 * (potentially empty) list of wishlists that are owned by that household. */
export const $get = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');

    // Resolve the household and make sure the current user belongs to it.
    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    // Get the wishlists associated with this household, if any.
    const result = await dbWishlistList(ctx, access.household.id);
    return success(ctx, `found ${result.length} wishlist(s) for household ${householdIdOrSlug}`, result);
  }
);


/******************************************************************************/
