/******************************************************************************/


import { getSessionList, getSessionDetails } from '../db/session.js';
import { success, fail } from "./common.js";


/******************************************************************************/


/* Given an object of the form:
 *   {
 *   }
 *
 * Insert a new session report into the system with the details from the object.
 *
 * This will do all updates required to insert the record for this session
 * report; an object that contains the full details of the new report (as it
 * would be returned from the details request below) is returned back. */
export async function sessionAddReq(ctx) {
  throw new Error(`not implemented yet`);
}


/******************************************************************************/


/* Fetch a short list of all of the session reports that are currently known to
 * the system.
 *
 * In the future this will provide various filters to control which items are
 * returned, but at time of writing (during devember) this is more simplistic
 * than that and just returns all sessions. */
export async function sessionListReq(ctx) {
  // Fetch and return the list.
  const result = await getSessionList(ctx);

  return success(ctx, `found ${result.length} session(s)`, result);
}


/******************************************************************************/


/* Given a specific session report ID, return back an object with the full
 * details of that session report, if possible. */
export async function sessionDetailsReq(ctx) {
  // Get the session ID
  const { sessionId } = ctx.req.param();

  // Look up the session; if we don't fiond one, then report that it does not
  // exist.
  const result = await getSessionDetails(ctx, sessionId);
  if (result === null) {
    return fail(ctx, `no such session ${sessionId}`, 404)
  }

  return success(ctx, `information on session ${sessionId}`, result);
}


/******************************************************************************/

