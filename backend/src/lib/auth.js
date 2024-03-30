/******************************************************************************/


import { getCookie } from 'hono/cookie';
import * as jose from 'jose';

import { getDBResult } from '#db/common';
import { dbUserInsert, dbUserDetails } from '#db/user';


/******************************************************************************/


/* This object holds a jose Remote JWK Set; in order to initialize it we need
 * some data from the environment, which is available from the context used in
 * hono requests.
 *
 * So, the value is undefined here and we lazily instantiate it when it is first
 * required. */
let JWKS = undefined;


/* This object is used to cache logins for users while the system is running.
 *
 * The keys are the underlying UUID's of users and the values are the internal
 * userId values for those users.
 *
 * The UUID's are invariant and can never change once they're assigned by
 * Cloudflare Access, and invalidation of user access happens upstream of us,
 * so this cache is persistent and never needs to be updated while the worker
 * is actively running. */
const userIdCache = {};


/******************************************************************************/


/* Given a Cloudflare Access user UUID and identity nonce (which are both
 * provided in the authorization JWT), fetch the details of the currently active
 * session.
 *
 * On success, the return value is an object that contains the user details of
 * the current session for the given user. If any error occurs, null is returned
 * instead.
 *
 * A successful return does not contain the entire data set provided by the API,
 * but rather just the parts that define the user themselves.
 *
 * This will only work in a production environment, since the nonce is required
 * and the local tokens used for development testing cannot have a valid nonce
 * in them. */
export async function cfGetUserSession(ctx, userUID, userNonce) {
  // The URI used to talk to the users API to get the session information for
  // a user.
  const sessionURI = `https://api.cloudflare.com/client/v4/accounts/${ctx.env.CF_ACCOUNT_ID}/access/users/${userUID}/active_sessions/${userNonce}`;

  // In order to fetch session details, we need to create an authorized GET
  // request.
  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ctx.env.CF_ACCESS_TOKEN}`
    }
  };

  // Fetch the session details. This will only reject if there is a network
  // issue, which will be caught by the caller.
  const res = await fetch(sessionURI, options);
  const lookup = await res.json();

  // If the request failed, gather all of the error messages and use them to
  // raise an error to the caller.
  if (res.ok === false) {
    console.log(`error getting session details: ${JSON.stringify(lookup.errors)}`);
    return null;
  }

  return lookup.result;
}


/******************************************************************************/


/* Given a request context for an incoming request, this will fetch from it the
 * authorization JWT that indicates who the currently active user is for this
 * connection, verify the JWT, and then return back the payload section of the
 * token.
 *
 * If the token fully validates, the payload of the token (the claims) are
 * returned back; otherwise, the return value is null to signal something is
 * wrong (and the log will say what exactly).
 *
 * This enforces that all tokens:
 *   - Are for the configured audience
 *   - Are from the configured issuer
 *
 * In addition, the signing algorithm on the token must be correct; in dev mode
 * this must be "none" and in production is must be the specific style of
 * algorithm used by Cloudflare.
 *
 * This means that you cannot mix tokens between the local development
 * environment and production. If you see local tokens failing, this is likely
 * the issue. */
export async function getAuthorizationJWT(ctx) {
  // Regardless of the validation required, the contents of the token must
  // conform to the values set here.
  const validation = {
    audience: ctx.env.CF_AUD_TAG,
    issuer: ctx.env.CF_TEAM_DOMAIN
  }

  try {
    // Get the cookie that contains the authorization token.
    const jwt = getCookie(ctx, 'CF_Authorization');
    if (jwt === undefined) {
      console.log(`no authorization token found in request`);
      return null;
    }

    // Decode and validate the token.
    let result;
    if (ctx.env.CF_DEV_MODE !== undefined) {
      // We are running in development mode; the token must explicitly be
      // unsigned and otherwise conform to our validation values, or an error is
      // thrown.
      result = jose.UnsecuredJWT.decode(jwt, { ...validation, algorithms: ['none'] });
    } else {
      // Instantiate the JWKS key store if it has not been initialized yet.
      if (JWKS === undefined) {
        console.log(`JWKS init: ${ctx.env.CF_TEAM_JWKS}`);
        JWKS = jose.createRemoteJWKSet(new URL(ctx.env.CF_TEAM_JWKS));
      }

      // In production mode, the token must explicitly be signed by a key from
      // the configured JWKS, using a specific algorithm, and otherwise also
      // conform to our validation values, or an error is thrown.
      result = await jose.jwtVerify(jwt, JWKS, { ...validation, algorithms: ['RS256'] });
    }

    // Token decoded and validated appropriately, so return the payload back.
    return result.payload;
  }
  catch (error) {
    console.log(`authorization failed: ${error.message}`);
    return null;
  }
}


/******************************************************************************/


/* Given the subject and identity nonce of a valid JWT that represents a user of
 * the system, return back their internal userId value.
 *
 * In the case that such a user does not exist in the database yet, a new base
 * entry for that user will be inserted and the new userId is returned.
 *
 * This uses a cache to ensure that database lookups to map the external UUID of
 * users with their internal ID are as minimal as possible.
 *
 * In the unlikely event that a new user is provided but they cannot be added to
 * the database, this will return null instead after logging an error. */
async function getUnderlyingUser(ctx, subject, nonce) {
  // If this user is in the cache, then we can just return directly.
  let userId = userIdCache[subject];
  if (userId !== undefined) {
    return userId;
  }

  // The user isn't in the cache yet, so look them up in the database based on
  // their external ID, which is the subject of the incoming JWT.
  let userInfo = await dbUserDetails(ctx, subject);

  // If we don't find a user in the database, then we need to insert a new
  // record instead. This only happens once per user, at the time of their
  // first access to the system.
  if (userInfo === null) {
    // Get the current login session details for this user; if that fails, we
    // cannot continue.
    const sessionDetails = await cfGetUserSession(ctx, subject, nonce);
    if (sessionDetails === null) {
      console.log(`unable to look up session details for user; cannot add new user`);
      return null;
    }

    // Insert a new user based on the session data we looked up.
    userInfo = await dbUserInsert(ctx, sessionDetails);
  }

  // We either looked up a user, or we added one to the database. Either way,
  // update the cache and return the new ID.
  userIdCache[subject] = userInfo.id;
  return userInfo.id;
}


/******************************************************************************/


/* Given a request context for an incoming request, this will fetch from it the
 * authorization JWT that indicates who the currently active user is for this
 * connection, verify the signature on the JWT, and then return back details on
 * the user represented.
 *
 * If there are any issues related to this, they will be logged to the console
 * and the return value is null.
 *
 * In all other cases, the return value is an object that describes the
 * authenticated user. */
export async function getAuthorizedUser(ctx) {
  // Get and validate the incoming token.
  const tokenInfo = await getAuthorizationJWT(ctx);
  if (tokenInfo === null) {
    return null;
  }

  // If there is a common name, then the token represents an access token that
  // is accessing us (rather than a user); in that case, validate that the
  // token is the expected one, and convert to the appropriate value.
  if (tokenInfo.common_name !== undefined) {
    if (tokenInfo.common_name !== ctx.env.CF_SERVICE_CLIENTID) {
      console.log(`access by unknown service token: ${tokenInfo.common_name}`);
      return null;
    }

    console.log(`elevating access token to user ${ctx.env.CF_SERVICE_USER}`);
    tokenInfo.sub = ctx.env.CF_SERVICE_USER;
    tokenInfo.identity_nonce = 'NotANonce';
  }

  // Using the token information, get the current userId; this will pull from
  // a cache for speed.
  return await getUnderlyingUser(ctx, tokenInfo.sub, tokenInfo.identity_nonce);
}

/******************************************************************************/
