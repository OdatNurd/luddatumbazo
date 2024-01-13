/******************************************************************************/


import { Hono } from 'hono'
import { wrappedRequest as _, validate } from '../common.js';

import { guestListReq } from './list.js';
import { updateGuestsReq, NewGuestSchema } from './update.js';
import { purgeGuestsReq } from './purge.js';


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
