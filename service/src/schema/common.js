/******************************************************************************/


import { z } from 'zod';
import slug from 'slug';


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
    // An optional field is valid if it's not present at all.
    if (value === undefined && isRequired === false) {
      return undefined;
    }

    const parsed = Number(value);
    if (isNaN(parsed) === true) {
      // If a value *is* present but it's not a number, it's an error,
      // regardless of whether it was required or not.
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
 * string value if the value is not a number.
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