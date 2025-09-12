/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { NewGuestSchema } from '#schema/guest';

import { dbGuestUpdate } from '#db/guest';


/******************************************************************************/


/* Given a list of objects that represent guest users, insert any items that
 * do not already exist in the list, skip over any that do, and return back a
 * full list (per guestListReq) that includes all of the guest users that now
 * exist as a result of the update. */
export const $put = routeHandler(
  validateZod('json', NewGuestSchema),

  async (ctx) => {
    // Get the list of guest records from the input request
    const guestList = ctx.req.valid('json');

    // Perform the update and capture the results.
    const result = await dbGuestUpdate(ctx, guestList);

    return success(ctx, `updated guest records`, result);
  }
);


/******************************************************************************/