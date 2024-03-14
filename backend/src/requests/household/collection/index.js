/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { HouseholdLookupIDSchema } from '#schema/household';
import { CollectionAddGameSchema, CollectionRemoveGameSchema } from '#schema/collection';

import { householdCollectionReq } from '#requests/household/collection/list';
import { householdCollectionAddReq } from '#requests/household/collection/insert';
import { householdCollectionDeleteReq } from '#requests/household/collection/delete';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const collection = new Hono();


collection.get('/:idOrSlug',
         validate('param', HouseholdLookupIDSchema),
         ctx => _(ctx, householdCollectionReq));

collection.put('/:idOrSlug',
         validate('param', HouseholdLookupIDSchema),
         validate('json', CollectionAddGameSchema),
         ctx => _(ctx, householdCollectionAddReq));

collection.delete('/:idOrSlug',
         validate('param', HouseholdLookupIDSchema),
         validate('json', CollectionRemoveGameSchema),
         ctx => _(ctx, householdCollectionDeleteReq));


/******************************************************************************/
