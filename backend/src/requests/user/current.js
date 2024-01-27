/******************************************************************************/


import { success, fail } from '#requests/common';

import { findUserInternal } from '#db/user';


/******************************************************************************/


/* Return back the details of the currently authenicated user; the userId for
 * that user comes in the JWT that arrives with each request, and should always
 * exist (since otherwise the middleware would not let us get here). */
export async function currentUserDetailsReq(ctx) {
  const userId = ctx.get('userId');

  // Try to find the user in question
  const user = await findUserInternal(ctx, userId, true);
  if (user === null) {
    return fail(ctx, `missing entry for ${userId}`, 500);
  }

  return success(ctx, `details for user ${userId}`, user);
}



/******************************************************************************/
