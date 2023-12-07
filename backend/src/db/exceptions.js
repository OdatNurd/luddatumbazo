/******************************************************************************/


/* This is a custom exception that's thrown by any of our code that handles
 * gathering BoardGameGeek data or otherwise converting it from their XML data
 * into our normalized JSON format.
 *
 * This exception carries with it not only the error message, but also the
 * status code that should be returned back if this exception occured as a
 * result of a query. */
export class BGGLookupError extends Error {
  constructor(message = "", status, ...args) {
    super(message, ...args);
    this.status = status;
  }
}


/******************************************************************************/

