/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { collection } from '#requests/household/collection/index';
import { wishlist } from '#requests/household/wishlist/index';
import { HouseholdLookupIDSchema, HouseholdCreateSchema } from '#schema/household';

import { reqHouseholdCreate } from '#requests/household/create';
import { reqHouseholdList } from '#requests/household/list';
import { reqHouseholdDetails } from '#requests/household/details';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const household = new Hono();


household.put('/create',
         validate('json', HouseholdCreateSchema),
         ctx => _(ctx, reqHouseholdCreate));

household.get('/list', ctx => _(ctx, reqHouseholdList));

household.get('/details/:householdIdOrSlug',
         validate('param', HouseholdLookupIDSchema),
         ctx => _(ctx, reqHouseholdDetails));


household.route('/collection', collection);
household.route('/wishlist', wishlist);


/******************************************************************************/
