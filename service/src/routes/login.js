/******************************************************************************/


import {
  FLOW_COOKIE, flowCookieHeader,
  generatePKCE, authRedirectURL
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
 * trip. The optional prompt=login parameter asks the provider to demand
 * credentials again, which is what the "switch user" affordance uses. */
export const $get = async (ctx) => {
  const { verifier, challenge } = await generatePKCE();
  const state = crypto.randomUUID().replace(/-/g, '');
  const returnTo = ctx.req.query('returnTo') ?? '';

  // Bundle up everything the callback will need in order to finish the flow.
  const flow = btoa(JSON.stringify({ verifier, state, returnTo }));

  const res = ctx.redirect(authRedirectURL(ctx, challenge, state, ctx.req.query('prompt')));
  res.headers.append('Set-Cookie', flowCookieHeader(flow));
  return res;
};


/******************************************************************************/
