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

  return options;
})();


/******************************************************************************/


/* This function will make a request to the underlying API at the endpoint
 * given, using the desired method. If provided, a body will be given in the
 * request.
 *
 * The method makes an appropriate options object for the fetch() call using the
 * provided details, and will mix in any provided options as well.
 *
 * The result of this will be the resulting JSON of the call. Any errors in
 * transmission or in the request as a whole will be handled by raising an error
 * for the outer code to handle as part of an error block in a load zone. */
async function api_call(method, endpoint, body, options) {
  console.log(method, endpoint, body ?? '', options ?? '');

  // If we got a body, trim away any fields that are undefined since they mess
  // up things downstream.
  if (body !== undefined) {
    // Trim the undefined keys.
    Object.keys(body).forEach(key => body[key] === undefined && delete body[key])

    // If the object is now empty, drop the body entirely.
    if (Object.keys(body).length === 0) {
      body = undefined;
    }
  }

  // If the method is GET and there is a body, this should be set as URL search
  // parameters instead.
  if (method.toUpperCase() === 'GET' && body !== undefined) {
    // Convert the body into a query string and then drop the body, or it will
    // end up being transmitted, which gets fetch() real mad.
    const params = new URLSearchParams(body);
    body = undefined;

    // Adjust the endpoint so that it includes the query paramters.
    endpoint = `${endpoint}?${params.toString()}`
  }

  // Set up our options; these start with the base options, and then we overlay
  // anything else that's required onto them.
  options = {
    ...baseOptions,

    // Store the provided method and body
    method,
    body,

    // Tack in any other options that were specifically requested
    ...options
  };

  // Perform the fetch using the provided options; if there is a network error,
  // this will throw right away. Otherwise, grab the data in the body.
  const response = await fetch(`${API}${endpoint}`, options);
  const result = await response.json();

  // If the response is not valid, throw an error. This occurs when the error is
  // not strictly network related.
  if (response.ok === false) {
    // If the response body has a message, that tells us what went wrong, so
    // use that in the exception
    if (result.message !== undefined) {
      throw new Error(result.message);
    }

    // No message, so just generate a generic error.
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  // The ultimate result of this should be the data portion of the payload; if
  // it is not present, raise an error.
  if (result.data === undefined) {
    throw new Error('the returned data was not properly formatted');
  }

  // Return back the body.
  return result.data;
}


/******************************************************************************/


/* Exported API action; this is a thin wrapper around the upper api call
 * mechanism that provides the appropriate method arguments, to make the call
 * point more expressive. */
const methods = ['get', 'put', 'post', 'delete', 'patch'];
export const api = Object.fromEntries(methods.map(method => [
  method, (...args) => api_call(method, ...args)
]));


/******************************************************************************/
