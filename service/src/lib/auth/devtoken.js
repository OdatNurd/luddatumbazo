/******************************************************************************/


import { getCookie } from 'hono/cookie';
import * as jose from 'jose';


/******************************************************************************/


/* The development token path, and the analog of the old CF_Authorization
 * cookie (which is deliberately not what this is called any more, since
 * Cloudflare Zero Trust is going away and the name would just be confusing).
 *
 * The tools/makeJwt.js script mints an unsigned JWT that is injected as a
 * cookie; when (and only when) the worker is running in development mode, that
 * token is accepted as a valid identity. This exists purely so that local
 * development and the API test collection can get at the system without a
 * browser login.
 *
 * Tokens made this way are only ever accepted in development mode; a real
 * deployment cannot be talked into accepting them. */
export const DEV_TOKEN_COOKIE = 'luddatumbazo_auth';


/******************************************************************************/


/* Look for a development token on the request and, if development mode is on
 * and the token is structurally valid, return the identity that it carries.
 *
 * In all other cases the return value is null and the request is left to be
 * authenticated some other way. */
export function devIdentity(ctx) {
  // Development mode is opt in and must never be set in a real deployment.
  if (ctx.env.CF_DEV_MODE === undefined) {
    return null;
  }

  const jwt = getCookie(ctx, DEV_TOKEN_COOKIE);
  if (jwt === undefined) {
    return null;
  }

  try {
    // The token is decoded and validated against our expected values, but is
    // not signature checked; development tokens are always unsigned.
    const result = jose.UnsecuredJWT.decode(jwt, {
      audience: ctx.env.CF_AUD_TAG,
      issuer: ctx.env.CF_TEAM_DOMAIN,
      algorithms: ['none']
    });

    return { sub: result.payload.sub };
  }
  catch (error) {
    console.log(`development token validation failed: ${error.message}`);
    return null;
  }
}


/******************************************************************************/
