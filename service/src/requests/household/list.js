/******************************************************************************/


import { success } from '#requests/common';

import { dbHouseholdList } from '#db/household';


/******************************************************************************/


/* Return back a list of all of the households that are known to the system.
 * This can conceivably be an empty list. */
export async function reqHouseholdList(ctx) {
  const result = await dbHouseholdList(ctx);

  return success(ctx, `found ${result.length} households`, result);
}



/******************************************************************************/
