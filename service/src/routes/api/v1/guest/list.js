/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';

import { dbGuestList } from '#db/guest';


/******************************************************************************/


/* Return back a list of all of the current unique guest users; this may be an
 * empty list. */
export const $get = routeHandler(
  async (ctx) => {
    // Try to look up the data; if we didn't find anything we can signal an
    // error back.
    const result = await dbGuestList(ctx);

    return success(ctx, `found ${result.length} guest(s)`, result);
  }
);


/******************************************************************************/