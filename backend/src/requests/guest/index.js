/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { NewGuestSchema } from '#schema/guest';

import { guestListReq } from '#requests/guest/list';
import { updateGuestsReq } from '#requests/guest/update';
import { purgeGuestsReq } from '#requests/guest/purge';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const guest = new Hono();


guest.put('/add',
          validate('json', NewGuestSchema),
          ctx => _(ctx, updateGuestsReq));

guest.get('/list', ctx => _(ctx, guestListReq));

guest.get('/purge', ctx => _(ctx, purgeGuestsReq));
guest.delete('/purge', ctx => _(ctx, purgeGuestsReq));


/******************************************************************************/
