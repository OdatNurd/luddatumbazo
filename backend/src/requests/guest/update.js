/******************************************************************************/


import { updateGuests } from '#db/guest';
import { makeDisplayName } from '#db/common';
import { success } from "#requests/common";
import { z } from 'zod';


/******************************************************************************/


/* When adding new guests to the system, the only data that's required is the
 * first and last name of the guest to be added. No other fields (including
 * name) are valid in this context. */
export const NewGuestSchema = z.array(
  z.object({
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().default('')
  }).transform((value, zCtx) => {
    if (value.displayName === '') {
      value.displayName = makeDisplayName(value.firstName, value.lastName);
    }

    return value;
  })
);


/******************************************************************************/


/* Given a list of objects that represent guest users, insert any items that
 * do not already exist in the list, skip over any that do, and return back a
 * full list (per guestListReq) that includes all of the guest users that now
 * exist as a result of the update. */
export async function updateGuestsReq(ctx) {
  // Get the list of guest records from the input request
  const guestList = ctx.req.valid('json');

  // Perform the update and capture the results.
  const result = await updateGuests(ctx, guestList);

  return success(ctx, `updated guest records`, result);
}


/******************************************************************************/
