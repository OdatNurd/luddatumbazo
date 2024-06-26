/******************************************************************************/


import { success, fail } from '#requests/common';

import { dbHouseholdDetails } from '#db/household';
import { dbGameOwnedList } from '#db/game';


/******************************************************************************/


/* Given an identifier or slug for a household, validate that the household
 * exists, and then return back a (potentially empty) list of games that is
 * owned by that household. */
export async function reqHouseholdCollectionContents(ctx) {
  const { householdIdOrSlug } = ctx.req.valid('param');

  // Try to find the household in question
  const household = await dbHouseholdDetails(ctx, householdIdOrSlug);
  if (household === null) {
    return fail(ctx, `unable to locate household with id ${householdIdOrSlug}`, 404);
  }

  // Get the games associated with this household, if any.
  const result = await dbGameOwnedList(ctx, household.id);
  return success(ctx, `found ${result.length} games for household ${householdIdOrSlug}`, result);
}


/******************************************************************************/
