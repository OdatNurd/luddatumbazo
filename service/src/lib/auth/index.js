/******************************************************************************/


import { serviceIdentity } from './service-token.js';
import { devIdentity } from './devtoken.js';
import { resolveUser } from './users.js';
import {
  readSession,
  identityFromSession,
  sessionNeedsRenewal,
  issueSession,
  sessionCookieHeader
} from './session.js';


/******************************************************************************/


/* Determine who the incoming request is acting as, and return their internal
 * userId.
 *
 * Three credential sources are checked, in order:
 *
 *   1. The service token, a static bearer token for command line and test
 *      tooling that acts as one configured user.
 *   2. The application session cookie, which is a signed JWT minted at login.
 *   3. The development token, an unsigned JWT accepted only in development
 *      mode, for local tooling.
 *
 * A user that has logged in via the identity provider but does not exist in the
 * database yet is provisioned automatically on this first request.
 *
 * When the session cookie is getting long in the tooth a fresh session token is
 * minted and stashed on the context, so that middleware can attach it to the
 * outgoing response as a sliding renewal.
 *
 * On any failure the return value is null and the request should be treated as
 * unauthenticated. */
export async function authGetUser(ctx) {
  // A service token acts as the configured user and nothing else.
  const service = serviceIdentity(ctx);
  if (service !== null) {
    return await resolveUser(ctx, service, false);
  }

  // The nominal case; a verified session for a logged in user.
  const session = await readSession(ctx);
  if (session !== null) {
    const identity = identityFromSession(session);

    // If the session is past the halfway point of its life, mint a fresh token
    // now; the middleware will attach it to the response on the way out, which
    // keeps an actively used session from ever lapsing mid task.
    if (sessionNeedsRenewal(session)) {
      ctx.set('auth:renew', await issueSession(ctx, identity));
    }

    return await resolveUser(ctx, identity, true);
  }

  // Lastly the development only token path used by local tooling.
  const dev = devIdentity(ctx);
  if (dev !== null) {
    return await resolveUser(ctx, dev, false);
  }

  return null;
}


/******************************************************************************/


/* If a sliding session renewal was staged during authentication, attach it to
 * the outgoing response as a Set-Cookie header.
 *
 * This is called by middleware after the response has been produced; the
 * response is returned back for convenience. */
export function applySessionRenewal(ctx, res) {
  const jwt = ctx.get('auth:renew');
  if (jwt !== undefined) {
    res.headers.append('Set-Cookie', sessionCookieHeader(ctx, jwt));
  }
  return res;
}


/******************************************************************************/


/* Re-export the pieces of the auth system that route handlers need to interact
 * with directly (mostly the login and logout flows). */
export {
  readSession,
  issueSession,
  sessionCookieHeader,
  clearSessionCookieHeader,
  FLOW_COOKIE,
  flowCookieHeader,
  clearFlowCookieHeader
} from './session.js';

export {
  oidcConfig,
  clientAuth,
  appOrigin,
  providerOrigin,
  generatePKCE,
  authRedirectURL,
  exchangeCode,
  fetchIdentity
} from './oidc.js';


/******************************************************************************/
