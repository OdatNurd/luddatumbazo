/******************************************************************************/


import { success } from '#requests/common';

import { dbGuestPurge } from '#db/guest';


/******************************************************************************/


/* Given a list of objects that represent guest users, delete any items that
 * exist in the list, skipping any that do not currently exist. */
export async function purgeGuestsReq(ctx) {
  // If the method is DELETE, do a purge; otherwise, this will just list things
  // instead, so that the caller can survey the potential doom before bringing
  // it.
  const purgeRecords = (ctx.req.method === "DELETE");

  const result = await dbGuestPurge(ctx, purgeRecords);

  const msg = (purgeRecords === true)
               ? `purged all unused guest records`
               : `found ${result.length} unused guest records`;

  return success(ctx, msg, result);
}


/******************************************************************************/
