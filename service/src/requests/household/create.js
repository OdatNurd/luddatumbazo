/******************************************************************************/


import { success, fail } from '#requests/common';

import { dbHouseholdDetails, dbHouseholdCreate } from '#db/household';


/******************************************************************************/


/* Attempt to create a new household with the given name and slug. This will
 * also set up the root playlist for the new household. */
export async function reqHouseholdCreate(ctx) {
  const { name, slug } = ctx.req.valid('json');

  // Look up to see if such a household already exists or not.
  const exististingHousehold = await dbHouseholdDetails(ctx, slug);
  if (exististingHousehold !== null) {
    return fail(ctx, `household ${slug} already exists`, 400);
  }

  // There is not currently such a household, so insert one now.
  const newHousehold = await dbHouseholdCreate(ctx, name, slug);
  return success(ctx, `created new household '${name}'`, newHousehold);
}


/******************************************************************************/
