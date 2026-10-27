import { Collection, $check, $ } from "@axel669/aegis";

import { clientAuth } from '#lib/auth/oidc';


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
});


/******************************************************************************/
