/******************************************************************************/


import { BGGLookupError } from '#db/exceptions';

import { validator } from 'hono/validator';
import { z } from 'zod';

import slug from "slug";


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


/* Create a validator that will validate the type of request data provided
 * against a specifically defined schema object. The data is both validated
 * against the schema as well as filtered so that non-schema properties of the
 * data are discarded.
 *
 * This provides a middleware filter for use in Hono; it is expected to either
 * trigger a failure, or return the data that is the validated and cleaned
 * object from the request.
 *
 * When using this filter, underlying requests can fetch the validated data
 * via the ctx.req.valid() function, e.g. ctx.req.valid('json'). */
export const validate = (dataType, schemaObj) => validator(dataType, async (value, ctx) => {
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

  // If there are any field errors, then handle those by saying what is wrong.
  const keys = Object.keys(errors.fieldErrors);
  if (keys.length !== 0) {
    const field = keys[0];
    return fail(ctx, `error in ${field}: ${errors.fieldErrors[field][0]}`);
  }

  // If there is not a field error, then there has to be a form error instead,
  // which gives us more structural information on the error.
  return fail(ctx, errors.formErrors[0]);
});


/******************************************************************************/


/* During parsing of data, this can be used as part of a transform stage in a
 * schema to coerce the value into a number.
 *
 * The return value is a number, but errors can be flagged if the value is not
 * a valid number and the number is required.
 *
 * If the value does not convert into a number, and it's not required, then the
 * return value will be undefined as an indication of this. */
export function asNumber(isRequired) {
  // The underlying validation mechanism does not allow for extra arguments,
  // so return back a wrapped version of the actual function that will be used
  // so that it can close over our arguments here.
  return function(value, zCtx) {
    const parsed = Number(value);
    if (isNaN(parsed) === true) {
      // If the value is not strictly required, return undefined instead.
      if (isRequired === false) {
        return undefined;
      }

      // Flag this as an issue
      zCtx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Not a number",
      });

      return z.NEVER;
    }

    // All good
    return parsed;
  }
}


/******************************************************************************/


/* During parsing of data, this can be used as part of a transform stage in a
 * schema to coerce the value into a number if possible, falling back to a
 * string value if the value is ot a number.
 *
 * The return value is always either a number or a string; number is only ever
 * returned for input fields that can be coerced directly to a number. */
export function numberOrString(value, zCtx) {
  const parsed = Number(value);
  if (isNaN(parsed) === true) {
    return value;
  }

  return parsed;
}


/******************************************************************************/


/* During parsing of data, this can be used as part of a transform stage in a
 * schema to ensure that a field has a slug value in it.
 *
 * This can only be applied to an object, and will check the object to see if it
 * has a field named slugField that is set. If there is, nothing happens.
 *
 * Otherwise, the value from the name field is used to populate the slug into
 * the slug field.
 *
 * The returned value is the input object. */
export function makeSlug(nameField, slugField) {
  // The underlying validation mechanism does not allow for extra arguments,
  // so return back a wrapped version of the actual function that will be used
  // so that it can close over our arguments here.
  return function(value, zCtx) {
    // If there's no slug field, add one.
    if (value[slugField] === undefined || value[slugField] === '') {
      value[slugField] = slug(value[nameField]);
    }

    // All good
    return value;
  }
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
