/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { HouseholdLookupIDSchema } from '#schema/household';

import { householdCollectionReq } from '#requests/household/collection/list';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const collection = new Hono();


collection.get('/:idOrSlug',
         validate('param', HouseholdLookupIDSchema),
         ctx => _(ctx, householdCollectionReq));


/******************************************************************************/
