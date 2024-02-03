/******************************************************************************/


import { success, fail } from '#requests/common';

import { getHouseholdDetails } from '#db/household';
import { getHouseholdGameList } from '#db/game';


/******************************************************************************/


/* Given an identifier or slug for a household, validate that the household
 * exists, and then return back a (potentially empty) list of games that is
 * owned by that household. */
export async function householdGamesReq(ctx) {
  const { idOrSlug } = ctx.req.valid('param');

  // Try to find the household in question
  const household = await getHouseholdDetails(ctx, idOrSlug);
  if (household === null) {
    return fail(ctx, `unable to locate household with id ${idOrSlug}`, 404);
  }

  // Get the games associated with this household, if any.
  const result = await getHouseholdGameList(ctx, household.id);
  return success(ctx, `found ${result.length} games for household ${idOrSlug}`, result);
}


/******************************************************************************/
