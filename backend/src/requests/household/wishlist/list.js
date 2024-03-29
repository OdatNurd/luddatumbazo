/******************************************************************************/


import { success, fail } from '#requests/common';

import { getHouseholdDetails } from '#db/household';
import { getHouseholdGameList, getWishlistGameList } from '#db/game';


/******************************************************************************/


/* Given an identifier or slug for a household, validate that the household
 * exists, and then return back a (potentially empty) list of games that is
 * wish for by that household. */
export async function householdWishlistReq(ctx) {
  const { idOrSlug } = ctx.req.valid('param');

  // Try to find the household in question
  const household = await getHouseholdDetails(ctx, idOrSlug);
  if (household === null) {
    return fail(ctx, `unable to locate household with id ${idOrSlug}`, 404);
  }

  // Get the games associated with this household, if any.
  const result = await getWishlistGameList(ctx, household.id);
  return success(ctx, `found ${result.length} games wished for by household ${idOrSlug}`, result);
}


/******************************************************************************/
