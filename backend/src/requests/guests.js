/******************************************************************************/


import { BGGLookupError } from '../db/exceptions.js';
import { getGuestList, updateGuests, purgeGuests } from '../db/guests.js';
import { success, fail } from "./common.js";



/******************************************************************************/


/* Return back a list of all of the current unique guest users; this may be an
 * empty list. */
export async function guestListReq(ctx) {
  // Try to look up the data; if we didn't find anything we can signal an
  // error back.
  const result = await getGuestList(ctx);

  return success(ctx, `found ${result.length} guest(s)`, result);
}


/******************************************************************************/


/* Given a list of objects that represent guest users, insert any items that
 * do not already exist in the list, skip over any that do, and return back a
 * full list (per guestListReq) that includes all of the guest users that now
 * exist as a result of the update. */
export async function updateGuestsReq(ctx) {
  // Get the list of guest records from the input request
  const guestList = await ctx.req.json();

  // Perform the update and capture the results.
  const result = await updateGuests(ctx, guestList);

  return success(ctx, `found ${result.length} guest(s)`, result);
}


/******************************************************************************/


/* Given a list of objects that represent guest users, delete any items that
 * exist in the list, skipping any that do not currently exist. */
export async function purgeGuestsReq(ctx) {
  // Get the list of guest records from the input request
  const guestList = await ctx.req.json();

  // Perform the update and capture the results.
  const result = await purgeGuests(ctx, guestList);

  return success(ctx, `deleted ${result.length} guest(s)`, result);
}


/******************************************************************************/
