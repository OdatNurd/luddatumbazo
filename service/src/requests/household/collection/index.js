/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { HouseholdLookupIDSchema } from '#schema/household';
import { CollectionAddGameSchema, CollectionRemoveGameSchema } from '#schema/collection';

import { reqHouseholdCollectionContents } from '#requests/household/collection/contents';
import { reqHouseholdCollectionAdd } from '#requests/household/collection/insert';
import { reqHouseholdCollectionDelete } from '#requests/household/collection/delete';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const collection = new Hono();


collection.get('/:householdIdOrSlug/contents',
         validate('param', HouseholdLookupIDSchema),
         ctx => _(ctx, reqHouseholdCollectionContents));

collection.put('/:householdIdOrSlug/add',
         validate('param', HouseholdLookupIDSchema),
         validate('json', CollectionAddGameSchema),
         ctx => _(ctx, reqHouseholdCollectionAdd));

collection.delete('/:householdIdOrSlug/remove',
         validate('param', HouseholdLookupIDSchema),
         validate('json', CollectionRemoveGameSchema),
         ctx => _(ctx, reqHouseholdCollectionDelete));


/******************************************************************************/
