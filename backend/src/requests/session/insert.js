/******************************************************************************/


import { addSession, } from '#db/session';
import { success } from '#requests/common';


/******************************************************************************/


/* Given an object that contains the required data to insert a new session
 * report into the system, insert the required data and ship the results back.
 *
 * For details on the actual body of the object, see the addSession() call.
 *
 * This will do all updates required to insert the record for this session
 * report; an object that contains the full details of the new report (as it
 * would be returned from the details request below) is returned back. */
export async function sessionAddReq(ctx) {
  // Pull in the body of the request, which will contain the data for setting up
  // the session report.
  const sessionData = ctx.req.valid('json');

  // Add the session and return the result.
  const result = await addSession(ctx, sessionData);

  return success(ctx, `added new session report`, result);
}


/******************************************************************************/
