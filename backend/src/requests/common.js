/******************************************************************************/


import { BGGLookupError } from '../db/exceptions.js';

import { validator } from 'hono/validator';


/******************************************************************************/


/* Generate a standardized success response from an API call.
 *
 * This generates a JSON return value with the given HTTP status, with a
 * data section that contains the provided result, whatever it may be. */
export const success = (ctx, message, result, status) => {
  status ??= 200;
  result ??= [];

  ctx.status(status);
  return ctx.json({ success: true, message, data: result });
}


/******************************************************************************/


/* Generate a standardized error response from an API call.
 *
 * This generates a JSON return value with the given HTTP status, with an
 * error reason that is the reason specified. */
export const fail = (ctx, message, status) => {
  status ??= 400;

  ctx.status(status);
  return ctx.json({ success: false, message });
}


/******************************************************************************/


/* Create a validator that will validate the schema provided against the JSON
 * data from the context provided.
 *
 * This provides a middleware filter for use in Hono; it is expected to either
 * trigger a failure, or return the data that is the validated and cleaned
 * object from the request.
 *
 * The underlying request will be able to fetch this via: ctx.req.valid('json')
 * in the handler, rather than trying to collect the actual JSON data. */
export const validateAgainst = (schemaObj) => validator('json', async (value, ctx) => {
  // Using this schema, parse the data out; this does the work of conforming
  // the value to the appropriate schema.
  const result = await schemaObj.safeParseAsync(value);

  // If there was no issue, return the result back directly; this will be the
  // parsed and sanitized object.
  if (result.success === true) {
    return result.data;
  }

  // There was a problem; flatten the error structure down and grab out the
  // first field error to use as our failure message before we return.
  //
  // TODO: This could be made much better, but we're currently in a state of
  //       flux as to what the errors should look like and what library we use
  //       for the sanitization.
  // console.log(JSON.stringify(result.error, null, 2));
  const errors = result.error.flatten();
  const field = Object.keys(errors.fieldErrors)[0];

  // Return failure, indicating an issue with the first field with an error in
  // the return (in cases where there is more than one).
  return fail(ctx, `error in ${field}: ${errors.fieldErrors[field][0]}`);
});


/******************************************************************************/


/* Input: a bggGameId in the URL that represents the ID of a game from
 * BoardGameGeek that we want to insert.
 *
 * This will look up the data for the game and use it to perform the insertion
 * directly.
 *
 * The result of this query is the same as adding a game by providing an
 * explicit body. */
export async function wrappedRequest(ctx, handler) {
  try {
    return await handler(ctx);
  }
  catch (err) {
    // Handle BGG Lookup Errors specially.
    if (err instanceof BGGLookupError) {
      return fail(ctx, err.message, err.status);
    }

    // Fall back to a 500 error for everything else.
    return fail(ctx, err.message, 500);
  }
}


/******************************************************************************/
