import { Collection, $check, $ } from "@axel669/aegis";

import { clientAuth, authRedirectURL, switchUserURL } from '#lib/auth/oidc';


/******************************************************************************/


/** Exercise the pure helper that formats client authentication for the token
 * endpoint exchange.
 *
 * The helper is deliberately free of any context or network dependencies so
 * that the confidential (secret) and public (no secret) forms can be checked
 * directly; the exchange request itself is not under test here. */
export default Collection`OIDC Client Authentication`({
  "clientAuth": async () => {
    await $check`should return null when no secret is configured (public client)`
      .value(clientAuth({ clientId: 'luddatumbazo', clientSecret: undefined }))
      .eq($, null);

    await $check`should return null when the secret is an empty string`
      .value(clientAuth({ clientId: 'luddatumbazo', clientSecret: '' }))
      .eq($, null);

    await $check`should return Basic auth when a secret is configured (confidential client)`
      .value(clientAuth({ clientId: 'luddatumbazo', clientSecret: 'topsecret' }))
      .eq($, `Basic ${btoa('luddatumbazo:topsecret')}`);

    await $check`should form urlencode the credentials before base64 encoding them`
      .value(clientAuth({ clientId: 'id with:special', clientSecret: 's:ecret/1' }))
      .eq($, `Basic ${btoa('id%20with%3Aspecial:s%3Aecret%2F1')}`);
  },

  "authRedirectURL": async () => {
    const ctx = {
      env: {
        OIDC_AUTH_URL: 'https://auth.example.com/api/oidc/authorization',
        OIDC_TOKEN_URL: 'https://auth.example.com/api/oidc/token',
        OIDC_USERINFO_URL: 'https://auth.example.com/api/oidc/userinfo',
        OIDC_CLIENT_ID: 'luddatumbazo',
        OIDC_SCOPES: 'openid profile email groups'
      },
      req: {
        url: 'https://app.example.com/login',
        header: () => undefined
      }
    };

    const normal = new URL(authRedirectURL(ctx, 'challenge', 'state'));

    await $check`should not request the provider login prompt`
      .value(normal.searchParams.has('prompt'))
      .eq($, false);

    await $check`should not require reauthentication`
      .value(normal.searchParams.has('max_age'))
      .eq($, false);
  },

  "switchUserURL": async () => {
    const ctx = {
      env: {
        OIDC_AUTH_URL: 'https://auth.example.com/api/oidc/authorization'
      }
    };
    const authURL = 'https://auth.example.com/api/oidc/authorization?state=abc';
    const logout = new URL(switchUserURL(ctx, authURL));

    await $check`should send the browser to the provider logout endpoint`
      .value(logout.origin + logout.pathname)
      .eq($, 'https://auth.example.com/logout');

    await $check`should return to the authorization URL after logout`
      .value(logout.searchParams.get('rd'))
      .eq($, authURL);
  },
});


/******************************************************************************/
