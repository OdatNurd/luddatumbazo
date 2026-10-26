/******************************************************************************/


/* A generic OpenID Connect (OIDC) client that implements the authorization
 * code flow with PKCE.
 *
 * Every detail of the actual identity provider is provided by the environment,
 * which makes this module provider agnostic; swapping to a different provider
 * (such as Kinde) is a matter of configuration rather than code. All that is
 * required is that the provider speak standard OIDC.
 *
 * The flow is:
 *
 *   1. A PKCE challenge pair is generated and the browser is sent to the
 *      provider to authenticate.
 *   2. The provider sends the browser back to our redirect URI with an
 *      authorization code (or an error, if access was denied).
 *   3. The code and the PKCE verifier are exchanged for tokens on the back end.
 *   4. The access token is used to fetch the profile of the authenticated user,
 *      which is normalized into a standard identity object. */


/******************************************************************************/


/* Pull the provider configuration out of the environment and collect it into a
 * single object for return back.
 *
 * The redirect URI is derived from the request currently being serviced rather
 * than from configuration: the application is reachable on several hostnames
 * (the home lab proxy name, the deployed domain, localhost) and a single
 * configured value would only ever be right for one of them.
 *
 * Every one of the origins is registered with the provider as an exact redirect
 * URI, and the provider rejects any URI outside its allowlist, so a forged
 * Host header can only ever produce a login that fails there. */
export function oidcConfig(ctx) {
  return {
    authUrl: ctx.env.OIDC_AUTH_URL,
    tokenUrl: ctx.env.OIDC_TOKEN_URL,
    userinfoUrl: ctx.env.OIDC_USERINFO_URL,

    clientId: ctx.env.OIDC_CLIENT_ID,
    clientSecret: ctx.env.OIDC_CLIENT_SECRET,
    redirectUri: loginCallbackURL(ctx),
    scopes: ctx.env.OIDC_SCOPES ?? 'openid profile email groups'
  };
}


/******************************************************************************/


/* Build the client authentication header for a token endpoint request.
 *
 * When a client secret is configured the client is confidential and
 * authenticates itself with HTTP Basic, as described by RFC 6749 section 2.3.1
 * (the identifier and the secret are each form urlencoded before being base64
 * encoded together).
 *
 * Without a secret the client is public and has nothing to authenticate with;
 * it names itself with the bare client id in the request body instead. In that
 * case the return value is null.
 *
 * This is a pure helper (it takes the already gathered configuration) so that
 * the authentication formatting can be tested without making a network
 * request. */
export function clientAuth(config) {
  const { clientId, clientSecret } = config;

  if (clientSecret === undefined || clientSecret === null || clientSecret === '') {
    return null;
  }

  const encode = value => encodeURIComponent(value);
  const credentials = `${encode(clientId)}:${encode(clientSecret)}`;

  return `Basic ${btoa(credentials)}`;
}


/******************************************************************************/


/* The path of the login callback route; the redirect URI sent to the provider
 * is always this path under the origin of the current request. */
const CALLBACK_PATH = '/login/callback';


/******************************************************************************/


/* The public origin of the application itself, as seen by the browser whose
 * request is being serviced right now.
 *
 * The worker is always behind TLS termination (the local nginx proxy in the
 * home lab, or the Cloudflare edge itself), so the connection the worker sees
 * is plain while the browser used HTTPS. The standard X-Forwarded-Proto header
 * carries the scheme the browser actually used and is honored when it holds a
 * value we recognize.
 *
 * The host comes from the request URL, which the Cloudflare edge fills in with
 * the host the browser actually addressed. The one exception is the local
 * wrangler dev server: it presents every request as if it arrived at the
 * configured route hostname, no matter what the client addressed. The nginx
 * proxy in the home lab sets X-Forwarded-Host with the real host, so when a
 * proxy has supplied that header it wins. (A forged header can only break the
 * forger's own login: the identity provider refuses to send a code to a
 * redirect URI that is not registered.)
 *
 * This is used when we need to build a URL that points back at ourselves (the
 * redirect URI of a login, and the return link of a provider side logout). */
export function appOrigin(ctx) {
  const url = new URL(ctx.req.url);

  const proto = ctx.req.header('X-Forwarded-Proto')?.split(',')[0].trim();
  if (proto === 'http' || proto === 'https') {
    url.protocol = `${proto}:`;
  }

  const host = ctx.req.header('X-Forwarded-Host')?.split(',')[0].trim();
  if (host !== undefined && host !== '') {
    url.host = host;
  }

  return url.origin;
}


/******************************************************************************/


/* The full redirect URI that the provider sends the browser back to after a
 * login; always the callback path under the origin of the current request. */
export function loginCallbackURL(ctx) {
  return `${appOrigin(ctx)}${CALLBACK_PATH}`;
}


/******************************************************************************/


/* The origin of the identity provider itself, used to construct provider side
 * URLs that are not a part of the core OIDC flow (such as the logout link used
 * by the "switch user" affordance). */
export function providerOrigin(ctx) {
  return new URL(ctx.env.OIDC_AUTH_URL).origin;
}


/******************************************************************************/


/* Generates a Proof Key for Code Exchange (PKCE) challenge pair.
 *
 * This secures the OIDC authorization flow by ensuring the client exchanging
 * the code is the exact same one that initiated the login, mitigating
 * authorization code interception attacks. */
export async function generatePKCE() {
  // Generate a cryptographically strong random sequence of 32 bytes.
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  // Base64url encode the random bytes to create the verifier string.
  const verifier = btoa(String.fromCharCode(...array))
                     .replace(/\+/g, '-')
                     .replace(/\//g, '_')
                     .replace(/=/g, '');

  // Hash the verifier using SHA-256.
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);

  // Base64url encode the resulting SHA-256 hash to create the challenge.
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
                      .replace(/\+/g, '-')
                      .replace(/\//g, '_')
                      .replace(/=/g, '');

  return { verifier, challenge };
}


/******************************************************************************/


/* Build the full provider authorization URL that the browser is redirected to
 * in order to start a login.
 *
 * The provided PKCE challenge and CSRF state are embedded into it; if the
 * caller wants to force the provider to ask for credentials again (e.g. after
 * a failed login for a user without access), prompt may be set to 'login'. */
export function authRedirectURL(ctx, challenge, state, prompt) {
  const config = oidcConfig(ctx);

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', config.scopes);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);

  if (prompt === 'login') {
    authUrl.searchParams.set('prompt', 'login');
  }

  return authUrl.toString();
}


/******************************************************************************/


/* Given the authorization code returned by the provider and the PKCE verifier
 * that was generated when the flow started, perform the back channel token
 * exchange.
 *
 * The token endpoint is called directly from here; the browser never sees any
 * part of this. A configured client secret authenticates the exchange with
 * HTTP Basic (confidential client); without one the client names itself with
 * the bare client id (public client), which is exactly the old behaviour. On
 * success the token response (which includes the access token) is returned; on
 * any failure the return value is null. */
export async function exchangeCode(ctx, code, verifier) {
  const config = oidcConfig(ctx);

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.redirectUri,
    code_verifier: verifier
  });

  // RFC 6749 allows exactly one authentication method per request, so the
  // client id moves into the Basic header when a secret is present instead of
  // being sent in the body as well.
  const auth = clientAuth(config);
  if (auth === null) {
    body.set('client_id', config.clientId);
  }
  else {
    headers['Authorization'] = auth;
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body
  });

  if (response.ok === false) {
    console.log(`token exchange request failed: ${response.status}`);
    return null;
  }

  return await response.json();
}


/******************************************************************************/


/* Given an access token from a successful token exchange, fetch the profile of
 * the user that is logging in and normalize it into our standard identity
 * object.
 *
 * The identity object has the shape:
 *
 *   { sub, username, name, firstName, lastName, email, picture }
 *
 * Individual providers may not supply all of these values; anything missing is
 * filled in with a sensible fallback where one exists. On any failure the
 * return value is null. */
export async function fetchIdentity(ctx, accessToken) {
  const config = oidcConfig(ctx);

  const response = await fetch(config.userinfoUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (response.ok === false) {
    console.log(`userinfo request failed: ${response.status}`);
    return null;
  }

  return normalizeIdentity(ctx, await response.json());
}


/******************************************************************************/


/* Convert the raw userinfo payload of a provider into our standard identity
 * object.
 *
 * If the provider does not hand us a picture, one is derived from the profile
 * image URL template in the environment, which is keyed on the username. */
export function normalizeIdentity(ctx, userInfo) {
  const username = userInfo.preferred_username ?? userInfo.username ?? '';

  // The profile picture is either supplied by the provider directly, or is
  // derived from the configured template.
  const template = ctx.env.PROFILE_URL_TEMPLATE;
  const picture = userInfo.picture ??
      ((template !== undefined && username !== '') ?
          template.replaceAll('{username}', username) : '');

  // The name of the user; some providers only give us the full name, so any
  // missing pieces are filled in from it as a fallback.
  const name = userInfo.name ?? username ?? '';

  return {
    sub: userInfo.sub,
    username,
    name,
    firstName: userInfo.given_name ?? name.split(' ')[0] ?? '',
    lastName: userInfo.family_name ?? name.split(' ').slice(1).join(' ') ?? '',
    email: userInfo.email ?? '',
    picture
  };
}


/******************************************************************************/
