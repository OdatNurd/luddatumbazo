/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { UserIDSchema } from '#schema/user';

import { userListReq } from '#requests/user/list';
import { userDetailsReq } from '#requests/user/details';
import { currentUserDetailsReq } from '#requests/user/current';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const user = new Hono();


user.get('/list', ctx => _(ctx, userListReq));

user.get('/current', ctx => _(ctx, currentUserDetailsReq));

user.get('/details/:userId',
         validate('param', UserIDSchema),
         ctx => _(ctx, userDetailsReq));


/******************************************************************************/
