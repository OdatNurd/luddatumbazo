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
