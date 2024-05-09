/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _ } from '#requests/common';

import { reqServerVersion } from '#requests/server_info/version';



/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const server_info = new Hono();


server_info.get('/version', ctx => _(ctx, reqServerVersion));


/******************************************************************************/
