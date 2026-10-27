/******************************************************************************/


import { getCookie } from 'hono/cookie';
import * as jose from 'jose';


/******************************************************************************/


/* The name of the cookie that holds the application session.
 *
 * The value of the cookie is a JWT that we mint ourselves and sign with a
 * symmetric key; this means that unlike a plain data blob it cannot be forged
 * by the client, and that expiry is enforced server side by the exp claim
 * rather than being trusted to the browser. */
export const SESSION_COOKIE = 'luddatumbazo_session';

/* The name of the short lived cookie that carries the state of an in progress
 * login flow (the PKCE verifier, the CSRF state and the route to return to). */
export const FLOW_COOKIE = 'luddatumbazo_flow';

/* The signing algorithm used for the session JWT. */
const SESSION_ALGORITHM = 'HS256';


/******************************************************************************/


/* The key used to sign and verify session tokens; this comes from the
 * environment and is shared by nothing and nobody else. */
function sessionKey(ctx) {
  return new TextEncoder().encode(ctx.env.SESSION_SECRET);
}


/******************************************************************************/


/* The configured session lifetime, in seconds. */
export function sessionTTL(ctx) {
  return parseInt(ctx.env.SESSION_TTL ?? '28800', 10);
}


/******************************************************************************/


/* Mint a new session token for the given identity; this is a signed JWT that
 * carries the identity claims and a server side expiry. */
export async function issueSession(ctx, identity) {
  return await new jose.SignJWT({
    sub: identity.sub,
    username: identity.username,
    name: identity.name,
    firstName: identity.firstName,
    lastName: identity.lastName,
    email: identity.email,
    picture: identity.picture
  })
    .setProtectedHeader({ alg: SESSION_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${sessionTTL(ctx)}s`)
    .sign(sessionKey(ctx));
}


/******************************************************************************/


/* Read and validate the session cookie on an incoming request.
 *
 * The token is only accepted if the signature is intact and the expiry has not
 * passed; on any problem (including no session at all) the return value is
 * null. On success the claims of the session are returned. */
export async function readSession(ctx) {
  const jwt = getCookie(ctx, SESSION_COOKIE);
  if (jwt === undefined) {
    return null;
  }

  try {
    const result = await jose.jwtVerify(jwt, sessionKey(ctx), {
      algorithms: [SESSION_ALGORITHM]
    });
    return result.payload;
  }
  catch (error) {
    console.log(`session validation failed: ${error.message}`);
    return null;
  }
}


/******************************************************************************/


/* Rebuild the identity object that lives inside of a verified session, so that
 * it can be handed to the rest of the system in the same shape as a freshly
 * gathered profile. */
export function identityFromSession(payload) {
  return {
    sub: payload.sub,
    username: payload.username,
    name: payload.name,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    picture: payload.picture
  };
}


/******************************************************************************/


/* Determine whether a verified session is old enough that it should be renewed.
 *
 * Renewal happens once the session is past the halfway point of its lifetime,
 * which gives us a sliding expiry: an actively used session is always renewed
 * before it can lapse underneath the person doing work. */
export function sessionNeedsRenewal(payload) {
  const now = Math.floor(Date.now() / 1000);
  return now > ((payload.iat + payload.exp) / 2);
}


/******************************************************************************/


/* Build the full Set-Cookie header value that installs the given session token
 * into the browser. */
export function sessionCookieHeader(ctx, jwt) {
  return `${SESSION_COOKIE}=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; ` +
         `Max-Age=${sessionTTL(ctx)}`;
}


/******************************************************************************/


/* Build the full Set-Cookie header value that removes the session cookie from
 * the browser. */
export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}


/******************************************************************************/


/* Build the Set-Cookie header value that installs the given in progress login
 * flow state into the browser. The cookie is deliberately short lived, since it
 * only needs to survive the round trip to the provider and back. */
export function flowCookieHeader(value) {
  return `${FLOW_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; ` +
         `Max-Age=600`;
}


/******************************************************************************/


/* Build the Set-Cookie header value that removes the in progress login flow
 * cookie from the browser. */
export function clearFlowCookieHeader() {
  return `${FLOW_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}


/******************************************************************************/
