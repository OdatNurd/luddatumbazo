/******************************************************************************/


import { Hono } from 'hono'
import { wrappedRequest as _, validate } from '#requests/common';

import { guestListReq } from '#requests/guest/list';
import { updateGuestsReq, NewGuestSchema } from '#requests/guest/update';
import { purgeGuestsReq } from '#requests/guest/purge';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const guest = new Hono();

guest.put('/add', validate('json', NewGuestSchema), ctx => _(ctx, updateGuestsReq));
guest.get('/list', ctx => _(ctx, guestListReq));

// The get version lists items that can be purged, while the delete version will
// actually do the purge.
guest.get('/purge', ctx => _(ctx, purgeGuestsReq));
guest.delete('/purge', ctx => _(ctx, purgeGuestsReq));


/******************************************************************************/
