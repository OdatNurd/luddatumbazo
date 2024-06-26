/******************************************************************************/


import { success, fail } from '#requests/common';

import { dbHouseholdDetails } from '#db/household';
import { dbWishlistList } from '#db/wishlist';


/******************************************************************************/


/* Given an identifier or slug for a household, validate that the household
 * exists, and then return back a (potentially empty) list of wishlists that
 * are owned by that household. */
export async function reqHouseholdWishlistList(ctx) {
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


/******************************************************************************/
