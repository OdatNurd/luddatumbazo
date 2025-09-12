/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { UserIDSchema } from '#schema/user';

import { dbUserDetails } from '#db/user';


/******************************************************************************/


/* Return back a list of all of the users that are known to the system. This
 * can conceivably be an empty list. */
export const $get = routeHandler(
  validateZod('param', UserIDSchema),

  async (ctx) => {
    const { userId } = ctx.req.valid('param');

    // Try to find the user in question
    const user = await dbUserDetails(ctx, userId, true);
    if (user === null) {
      return fail(ctx, `unable to locate user with id ${userId}`, 404);
    }

    return success(ctx, `details for user ${userId}`, user);
  }
);


/******************************************************************************/
