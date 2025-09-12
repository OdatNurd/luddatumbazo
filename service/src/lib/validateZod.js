/******************************************************************************/


import { validator } from 'hono/validator';
import { fail } from '@odatnurd/cf-requests';


/******************************************************************************/


/* Create a validator that will validate the type of request data provided
 * against a specifically defined Zod schema object. The data is both validated
 * against the schema as well as filtered so that non-schema properties of the
 * data are discarded.
 *
 * This provides a middleware filter for use in Hono; it is expected to either
 * trigger a failure, or return the data that is the validated and cleaned
 * object from the request.
 *
 * When using this filter, underlying requests can fetch the validated data
 * via the ctx.req.valid() function, e.g. ctx.req.valid('json').
 *
 * This is now legacy code that's intended to be used until we can swap all of
 * our schemas over into a Joker format from Zod. */
export const validateZod = (dataType, schemaObj) => validator(dataType, async (value, ctx) => {
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
