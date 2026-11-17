/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { SessionIDSchema } from '#schema/session';

import { dbSessionDetails } from '#db/session';


/******************************************************************************/


/* Given a specific session report ID, return back an object with the full
 * details of that session report, if possible. */
export const $get = routeHandler(
  validateZod('param', SessionIDSchema),

  async (ctx) => {
    // Get the session ID
    const { sessionId } = ctx.req.valid('param');

    // Look up the session; if we don't find one, then report that it does not
    // exist. The current user is passed in so the result can say whether they
    // may edit this report.
    const result = await dbSessionDetails(ctx, sessionId, ctx.get('userId'));
    if (result === null) {
      return fail(ctx, `no such session ${sessionId}`, 404)
    }

    return success(ctx, `information on session ${sessionId}`, result);
  }
);


/******************************************************************************/