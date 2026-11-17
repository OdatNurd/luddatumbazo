/******************************************************************************/


import { routeHandler, success } from '@odatnurd/cf-requests';

import { dbSessionStatus } from '#db/session';


/******************************************************************************/


/* Return the counts used by the profile menu and the open-session view.
 *
 * This is an advisory summary, not an access-control decision: every
 * authenticated user may still read the full session list. */
export const $get = routeHandler(
  async (ctx) => {
    const result = await dbSessionStatus(ctx, ctx.get('userId'));

    return success(ctx, `found ${result.total} session report(s)`, result);
  }
);


/******************************************************************************/
