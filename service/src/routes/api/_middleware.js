/******************************************************************************/


import { authGetUser, applySessionRenewal } from '#lib/auth/index';
import { fail } from '@odatnurd/cf-requests';


/******************************************************************************/


/* Get the currently authorized user for the incoming request. If this
 * associates with a user, the userId of that user is added to the context for
 * downstream handlers to access. Otherwise, an auth error is raised and the
 * request is blocked.
 *
 * The identity of the request comes from one of the credential sources that the
 * auth system knows about: the session cookie of a logged in user (who is
 * provisioned into the database automatically on their first ever request),
 * the service token for tooling, or the development only token.
 *
 * When an active session is getting long in the tooth it is also renewed on the
 * way out, so that a person deep in a task never has their session lapse
 * underneath them. */
export const $any = [
  async (ctx, next) => {
    console.log(`[${ctx.req.method}] ${ctx.req.url}`);
    const userId = await authGetUser(ctx);

    // Raise 401 if the user is not authorized (user details is null)
    if (userId === null) {
      return fail(ctx, `not authorized`, 401);
    }

    ctx.set('userId', userId);
    await next();
    applySessionRenewal(ctx, ctx.res);
  }
]


/******************************************************************************/
