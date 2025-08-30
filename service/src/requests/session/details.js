/******************************************************************************/


import { success, fail } from '#requests/common';

import { dbSessionDetails } from '#db/session';


/******************************************************************************/


/* Given a specific session report ID, return back an object with the full
 * details of that session report, if possible. */
export async function reqSessionDetails(ctx) {
  // Get the session ID
  const { sessionId } = ctx.req.valid('param');

  // Look up the session; if we don't find one, then report that it does not
  // exist.
  const result = await dbSessionDetails(ctx, sessionId);
  if (result === null) {
    return fail(ctx, `no such session ${sessionId}`, 404)
  }

  return success(ctx, `information on session ${sessionId}`, result);
}


/******************************************************************************/

