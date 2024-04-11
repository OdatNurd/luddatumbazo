/******************************************************************************/


import { success, fail } from '#requests/common';

import { dbUserDetails } from '#db/user';


/******************************************************************************/


/* Return back details on the user with the specific internal identifier; this
 * may return failure if no such user exists. */
export async function reqUserDetails(ctx) {
  const { userId } = ctx.req.valid('param');

  // Try to find the user in question
  const user = await dbUserDetails(ctx, userId, true);
  if (user === null) {
    return fail(ctx, `unable to locate user with id ${userId}`, 404);
  }

  return success(ctx, `details for user ${userId}`, user);
}



/******************************************************************************/
