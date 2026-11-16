/******************************************************************************/


import { routeHandler, success } from '@odatnurd/cf-requests';

import { commitReference } from '#lib/build';


/******************************************************************************/


/* Return the metadata for the build that the worker is currently running.
 *
 * This lives under /api so that the regular API middleware gates it; a root
 * /version route would be public because the root gate only guards the app
 * shell. The client's background version check treats a 401 as "stop checking"
 * rather than as a session failure, since it must never bounce the browser to
 * the login page by itself. */
export const $get = routeHandler(
  async (ctx) => {
    ctx.header('Cache-Control', 'no-store');
    return success(ctx, 'current build information', commitReference);
  },
);


/******************************************************************************/
