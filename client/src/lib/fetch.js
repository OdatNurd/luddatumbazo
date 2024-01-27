/******************************************************************************/


/* The base link to the API; where we talk depends on where we are deployed,
 * which is configured via an environment variable. This gets injected into
 * the file at build time, so that the final deployed version appears to be
 * "hard coded" to the correct value. */
const API = `${process.env.GAME_API_ROOT_URI}/api/v1`;


/******************************************************************************/


/* Make a request to the underlying API for the API endpoint provided.
 * Optionally, you can also provide options to the fetch.
 *
 * The return value is the return of the fetch itself, which is done against the
 * configured API endpoint. */
export async function api(endpoint, options) {
    // If we're doing local stuff, we need cors magic cause we don't operate
    // on the same hostname.
    options = { ...options };
    options.credentials = 'include';

    // Perform the actual fetch.
    return fetch(`${API}${endpoint}`, options);
}


/******************************************************************************/
