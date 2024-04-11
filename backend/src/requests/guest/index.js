/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { NewGuestSchema } from '#schema/guest';

import { reqGuestList } from '#requests/guest/list';
import { reqUpdateGuests } from '#requests/guest/update';
import { reqPurgeGuests } from '#requests/guest/purge';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const guest = new Hono();


guest.put('/add',
          validate('json', NewGuestSchema),
          ctx => _(ctx, reqUpdateGuests));

guest.get('/list', ctx => _(ctx, reqGuestList));

guest.get('/purge', ctx => _(ctx, reqPurgeGuests));
guest.delete('/purge', ctx => _(ctx, reqPurgeGuests));


/******************************************************************************/
