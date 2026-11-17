/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { SessionIDSchema, UpdateSessionReportSchema } from '#schema/session';

import { dbSessionDetails, dbSessionUpdate } from '#db/session';


/******************************************************************************/


/* Given an object with some patch details for a session report, update an
 * existing session record to include the new data.
 *
 * This does not allow wholesale edits; only details such as the end time,
 * textual content and player status is allowed to change.
 *
 * The request will return data similar to an add/get, but with updated
 * details. */
export const $patch = routeHandler(
  validateZod('param', SessionIDSchema),
  validateZod('json', UpdateSessionReportSchema),

  async (ctx) => {
    // Fetch the ID of the session to update and the body of the update.
    const { sessionId } = ctx.req.valid('param');
    const updateData = ctx.req.valid('json');
    const actorId = ctx.get('userId');

    // Load the current report and decide whether this user may edit it. Open
    // sessions may be edited by their reporter and by any user player; closed
    // sessions may be edited only by their reporter.
    const session = await dbSessionDetails(ctx, sessionId, actorId);
    if (session === null) {
      return fail(ctx, `no such session ${sessionId}`, 404)
    }

    if (session.canEdit !== true) {
      return fail(ctx, `you do not have permission to edit session ${sessionId}`, 403);
    }

    // Update the session with the data; if there is no result from this, it is
    // because the session disappeared between the check and the update.
    const result = await dbSessionUpdate(ctx, sessionId, updateData, actorId);
    if (result === null) {
      return fail(ctx, `no such session ${sessionId}`, 404)
    }

    return success(ctx, `updated session ${sessionId}`, result);
  }
);


/******************************************************************************/
