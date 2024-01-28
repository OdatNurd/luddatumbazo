/******************************************************************************/


/* The base link to the API; where we talk depends on where we are deployed,
 * which is configured via an environment variable. This gets injected into
 * the file at build time, so that the final deployed version appears to be
 * "hard coded" to the correct value. */
const API = `${process.env.GAME_API_ROOT_URI}/api/v1`;

/* Set the base options which can be extended by any options that the caller
 * provides when invoking the API.
 *
 * Specifically, if the API is being served from a different origin than we are,
 * the browser will not pass through the authorization JWT when we call fetch;
 * in such a case we need to override the default credentials. */
const baseOptions = (() => {
  // Get the location of the local and remote ends of our connection.
  const local = new URL(window.location);
  const remote = new URL(API);

  // When the origins are different, we need to explicitly turn on inclusion of
  // credentials in the call. This also requires that the API end allow our
  // origin specifically in the list of CORS origins.
  const options = {
    credentials: (local.origin === remote.origin) ? 'same-origin' : 'include'
  }

  console.log(`base options are: ${JSON.stringify(options)}`);
  return options;
})();


/******************************************************************************/


/* Make a request to the underlying API for the API endpoint provided.
 * Optionally, you can also provide options to the fetch.
 *
 * The return value is the return of the fetch itself, which is done against the
 * configured API endpoint. */
export async function api(endpoint, options) {
  // Set up our options; these start with the base options, and then we overlay
  // anything else that's required onto them.
  options = { ...baseOptions, ...options };

  // Perform the actual fetch.
  return fetch(`${API}${endpoint}`, options);
}


/******************************************************************************/
