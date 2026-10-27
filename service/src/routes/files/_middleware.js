/******************************************************************************/


import { authGetUser, applySessionRenewal } from '#lib/auth/index';
import { fail } from '@odatnurd/cf-requests';


/******************************************************************************/


/* Guard the game asset file routes.
 *
 * These serve the contents of the file bucket, and used to be protected purely
 * by whatever sat in front of the worker; now that the worker is the gatekeeper
 * they need to authenticate in the same way as the API does. Copied file links
 * keep working for anyone who is logged in. */
export const $any = [
  async (ctx, next) => {
    const userId = await authGetUser(ctx);

    // Raise 401 if the user is not authorized.
    if (userId === null) {
      return fail(ctx, `not authorized`, 401);
    }

    ctx.set('userId', userId);
    await next();
    applySessionRenewal(ctx, ctx.res);
  }
]


/******************************************************************************/
