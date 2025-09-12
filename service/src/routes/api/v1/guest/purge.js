/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';

import { dbGuestPurge } from '#db/guest';


/******************************************************************************/


/* Given a list of objects that represent guest users, delete any items that
 * exist in the list, skipping any that do not currently exist.
 *
 * This operates in two distinct states; if the verb used is not DELETE, then
 * this returns the list of things that WOULD be purged, but does nothing (aka
 * a "dry run"). However if the verb is DELETE, then the deletion is actualy
 * carried out; in this case, the response contains no guests. */
async function handler(ctx) {
  // We only want to actually perform the purge when the verb is DELETE.
  const purgeRecords = (ctx.req.method === "DELETE");

  const result = await dbGuestPurge(ctx, purgeRecords);

  const msg = (purgeRecords === true)
               ? `purged all unused guest records`
               : `found ${result.length} unused guest records`;

  return success(ctx, msg, result);
}

/******************************************************************************/


/* The same handler is used for both routes; the verb used tells the handler
 * function how it should behave. */
export const $get = routeHandler(handler);
export const $delete = routeHandler(handler);


/******************************************************************************/
