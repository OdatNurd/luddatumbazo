/******************************************************************************/


import { success } from '#requests/common';

import { getUserList } from '#db/user';


/******************************************************************************/


/* Return back a list of all of the users that are known to the system. This
 * can conceivably be an empty list. */
export async function userListReq(ctx) {
  const result = await getUserList(ctx);

  return success(ctx, `found ${result.length} users`, result);
}



/******************************************************************************/
