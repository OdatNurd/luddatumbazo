/******************************************************************************/


import { BGGLookupError } from '../db/exceptions.js';


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
