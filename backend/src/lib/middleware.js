/******************************************************************************/


import { authGetUser } from '#lib/auth';
import { fail } from '#requests/common';


/******************************************************************************/


/* Get the currently authorized user from the JWT supplied with the incoming
 * request. If this associates with a user, the userId of that user is added
 * to the context for downstream handlers to access. Otherwise, an auth error
 * is raised and the request is blocked.
 *
 * The underlying mechaisms for this guarantee success if the user is able to
 * hit the endpoint because of how Cloudflare Access works. The only situations
 * in which this can fail is if there is something wrong with the JWT itself, or
 * if this is the first request by a user not yet in the database and we cannot
 * use the CF Session API to look up the user details to be able to add them. */
export async function authorization(ctx, next) {
  console.log(`[${ctx.req.method}] ${ctx.req.url}`);
  const userId = await authGetUser(ctx);

  // Raise 401 if the user is not authorized (user details is null)
  if (userId === null) {
    return fail(ctx, `not authorized`, 401);
  }

  ctx.set('userId', userId);
  await next()
}


/******************************************************************************/
