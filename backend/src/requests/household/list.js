/******************************************************************************/


import { success } from '#requests/common';

import { getHouseholdList } from '#db/household';


/******************************************************************************/


/* Return back a list of all of the households that are known to the system.
 * This can conceivably be an empty list. */
export async function householdListReq(ctx) {
  const result = await getHouseholdList(ctx);

  return success(ctx, `found ${result.length} households`, result);
}



/******************************************************************************/
