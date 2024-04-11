/******************************************************************************/


import { success, fail } from '#requests/common';

import { dbHouseholdDetails } from '#db/household';


/******************************************************************************/


/* Return back details on the household whose identifier or slug are provided
 * in the call. This may result in an error if there is no such household. */
export async function reqHouseholdDetails(ctx) {
  const { idOrSlug } = ctx.req.valid('param');

  // Try to find the household in question
  const household = await dbHouseholdDetails(ctx, idOrSlug);
  if (household === null) {
    return fail(ctx, `unable to locate household with id ${idOrSlug}`, 404);
  }

  return success(ctx, `details for household ${idOrSlug}`, household);
}



/******************************************************************************/
