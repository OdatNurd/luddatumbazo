/******************************************************************************/


import { updateSession } from '#db/session';
import { success, fail } from "#requests/common";


/******************************************************************************/


/* Given an object with some patch details for a session report, update an
 * existing session record to include the new data.
 *
 * This does not allow wholesale edits; only details such as the end time,
 * textual content and player status is allowed to change.
 *
 * The request will return data similar to an add/get, but with updated
 * details.
 */
export async function sessionUpdateReq(ctx) {
  // Fetch the ID of the session to update and the body of the update.
  const { sessionId } = ctx.req.valid('param');
  const updateData = ctx.req.valid('json');

  // Update the session with the data; if there is no result from this, it is
  // because the session does not exist, so we can report as such.
  const result = await updateSession(ctx, sessionId, updateData);
  if (result === null) {
    return fail(ctx, `no such session ${sessionId}`, 404)
  }

  return success(ctx, `updated session ${sessionId}`, result);
}


/******************************************************************************/
