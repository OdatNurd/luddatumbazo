/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { UserIDSchema } from '#schema/user';

import { reqUserList } from '#requests/user/list';
import { reqUserDetails } from '#requests/user/details';
import { reqCurrentUserDetails } from '#requests/user/current';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const user = new Hono();


user.get('/list', ctx => _(ctx, reqUserList));

user.get('/current', ctx => _(ctx, reqCurrentUserDetails));

user.get('/details/:userId',
         validate('param', UserIDSchema),
         ctx => _(ctx, reqUserDetails));


/******************************************************************************/
