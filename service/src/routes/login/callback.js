/******************************************************************************/


import { getCookie } from 'hono/cookie';

import {
  FLOW_COOKIE, clearFlowCookieHeader,
  issueSession, sessionCookieHeader,
  exchangeCode, fetchIdentity
} from '#lib/auth/index';
import { deniedURL, authErrorURL, safeReturnPath } from '#lib/auth/pages';


/******************************************************************************/


/* Finish a login.
 *
 * This is the redirect URI that the identity provider sends the browser back
 * to; it receives an authorization code (or an error if access was denied),
 * swaps the code for tokens on the back channel, fetches the profile of the
 * user that logged in and installs the signed application session cookie.
 *
 * Anything that goes wrong along the way lands the user on a styled error page
 * rather than a raw error string. */
export const $get = async (ctx) => {
  // If the provider reported an error then the user either has no access or
  // something went wrong on that side; show the denial page. This is what
  // triggers when the user is valid but their groups do not include the one for
  // this application.
  const error = ctx.req.query('error');
  if (error !== undefined) {
    const res = ctx.redirect(deniedURL(ctx, ctx.req.query('error_description') ?? error));
    res.headers.append('Set-Cookie', clearFlowCookieHeader());
    return res;
  }

  // Recover the state of the login flow that we stashed when it started.
  const code = ctx.req.query('code');
  const state = ctx.req.query('state');

  let flow = null;
  try {
    flow = JSON.parse(atob(getCookie(ctx, FLOW_COOKIE) ?? ''));
  }
  catch {
    // A missing or mangled flow cookie means we cannot trust this response.
  }

  const bail = (message) => {
    const res = ctx.redirect(authErrorURL(message));
    res.headers.append('Set-Cookie', clearFlowCookieHeader());
    return res;
  };

  // Without the code and a state that matches the one we generated, this is
  // either stale or not ours; either way we cannot continue.
  if (flow === null || code === undefined || state !== flow.state) {
    return bail('The login could not be completed because its session expired. Please try again.');
  }

  // Exchange the authorization code for tokens on the back channel.
  const tokens = await exchangeCode(ctx, code, flow.verifier);
  if (tokens === undefined || tokens === null || tokens.access_token === undefined) {
    return bail('The login could not be completed because the token exchange failed. Please try again.');
  }

  // With an access token in hand we can ask who this actually is.
  const identity = await fetchIdentity(ctx, tokens.access_token);
  if (identity === null) {
    return bail('The login could not be completed because the user profile could not be read. Please try again.');
  }

  // Mint the application session and send the user on their way, back to
  // wherever they were headed when all of this started.
  console.log(`login completed for ${identity.username || identity.sub}`);
  const res = ctx.redirect(safeReturnPath(flow.returnTo));
  res.headers.append('Set-Cookie', sessionCookieHeader(ctx, await issueSession(ctx, identity)));
  res.headers.append('Set-Cookie', clearFlowCookieHeader());
  return res;
};


/******************************************************************************/
