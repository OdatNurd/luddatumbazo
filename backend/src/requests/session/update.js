/******************************************************************************/


import { updateSession } from '../../db/session.js';
import { success, fail } from "../common.js";

import { z } from 'zod';


/******************************************************************************/


/* Updated session reports can adjust a few of the values in the session to
 * "Close" it; the core details, such as the game played or the people that
 * did the playing are static once they are entered. To adjust those, you need
 * to delete and then re-create the session. */
export const UpdateSessionReportSchema = z.object({
  // The session end time can be updated, or moved back into an open state.
  sessionEnd: z.string().datetime().nullable().default(null),

  // Games marked as learning games are excluded from some statistics, such as
  // average game length or for the purposes of calculating aggregate scores,
  // since such sessions are predicated on one or more players learning how to
  // play, which skews results.
  isLearning: z.boolean().default(false),

  // The title of the session report, and the textual descriptive content.
  title: z.string().default(''),
  content: z.string().default(''),
});


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

  return success(ctx, `short circut`, { sessionId, updateData });

  // Update the session with the data; if there is no result from this, it is
  // because the session does not exist, so we can report as such.
  const result = await updateSession(ctx, sessionId, updateData);
  if (result === null) {
    return fail(ctx, `no such session ${sessionId}`, 404)
  }

  return success(ctx, `updated session ${sessionId}`, result);
}


/******************************************************************************/
