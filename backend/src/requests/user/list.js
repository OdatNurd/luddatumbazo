/******************************************************************************/


import { success } from '#requests/common';

import { dbUserList } from '#db/user';


/******************************************************************************/


/* Return back a list of all of the users that are known to the system. This
 * can conceivably be an empty list. */
export async function userListReq(ctx) {
  const result = await dbUserList(ctx);

  return success(ctx, `found ${result.length} users`, result);
}



/******************************************************************************/
