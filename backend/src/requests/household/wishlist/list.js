/******************************************************************************/


import { success, fail } from '#requests/common';

import { dbHouseholdDetails, dbWishlistList } from '#db/household';


/******************************************************************************/


/* Given an identifier or slug for a household, validate that the household
 * exists, and then return back a (potentially empty) list of wishlists that
 * are owned by that household. */
export async function reqHouseholdWishlistList(ctx) {
  const { idOrSlug } = ctx.req.valid('param');

  // Try to find the household in question
  const household = await dbHouseholdDetails(ctx, idOrSlug);
  if (household === null) {
    return fail(ctx, `unable to locate household with id ${idOrSlug}`, 404);
  }

  // Get the games associated with this household, if any.
  const result = await dbWishlistList(ctx, household.id);
  return success(ctx, `found ${result.length} wishlist(s) for household ${idOrSlug}`, result);
}


/******************************************************************************/
