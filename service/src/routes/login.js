/******************************************************************************/


import {
  FLOW_COOKIE, flowCookieHeader,
  generatePKCE, authRedirectURL, switchUserURL
} from '#lib/auth/index';


/******************************************************************************/


/* Start a login.
 *
 * A PKCE challenge pair and a CSRF state value are generated and remembered in
 * a short lived cookie, then the browser is sent off to the identity provider
 * to do the actual authentication.
 *
 * The optional returnTo query parameter carries the route in the client that
 * the user was headed for, so that they can be put back on it after the round
 * trip. The switch=user parameter is an application-level signal that the
 * existing provider session must be cleared before authenticating; it is not
 * sent to the provider as an OIDC prompt. The older prompt=login form is still
 * accepted for links generated before switch=user was introduced. */
export const $get = async (ctx) => {
  const { verifier, challenge } = await generatePKCE();
  const state = crypto.randomUUID().replace(/-/g, '');
  const returnTo = ctx.req.query('returnTo') ?? '';

  // Bundle up everything the callback will need in order to finish the flow.
  const flow = btoa(JSON.stringify({ verifier, state, returnTo }));

  const switchingUser = ctx.req.query('switch') === 'user' ||
    ctx.req.query('prompt') === 'login';
  const authURL = authRedirectURL(ctx, challenge, state);

  // Switching users has to clear the provider session before the new
  // authorization request; otherwise Authelia reauthenticates the same account.
  // The authorization URL is a safe logout target because it is on the
  // provider's own origin, and it carries the flow state that will bring the
  // browser back to the application. It intentionally contains no prompt or
  // max_age parameters: after the logout it is a normal login request, which
  // is what avoids the provider's failing consent reauthentication step.
  const redirectURL = switchingUser
    ? switchUserURL(ctx, authURL)
    : authURL;

  const res = ctx.redirect(redirectURL);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.append('Set-Cookie', flowCookieHeader(flow));
  return res;
};


/******************************************************************************/
