/******************************************************************************/


import { success } from '#requests/common';

import { dbGuestList } from '#db/guest';


/******************************************************************************/


/* Return back a list of all of the current unique guest users; this may be an
 * empty list. */
export async function guestListReq(ctx) {
  // Try to look up the data; if we didn't find anything we can signal an
  // error back.
  const result = await dbGuestList(ctx);

  return success(ctx, `found ${result.length} guest(s)`, result);
}


/******************************************************************************/

