/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';

import { dbUserDetails } from '#db/user';


/******************************************************************************/


/* Return back the details of the currently authenicated user; the userId for
 * that user comes in the JWT that arrives with each request, and should always
 * exist (since otherwise the middleware would not let us get here). */
export const $get = routeHandler(
  async (ctx) => {
    const userId = ctx.get('userId');

    // Try to find the user in question
    const user = await dbUserDetails(ctx, userId, true);
    if (user === null) {
      return fail(ctx, `missing entry for ${userId}`, 500);
    }

    return success(ctx, `details for user ${userId}`, user);
  },
);


/******************************************************************************/
