/******************************************************************************/


import { Hono } from 'hono'
import { wrappedRequest as _, validate } from '#requests/common';

import { metadataUpdateReq } from '#requests/game/metadata/update';
import { metadataListReq } from '#requests/game/metadata/list';
import { metadataPurgeReq } from '#requests/game/metadata/purge';
import { metadataQueryReq } from '#requests/game/metadata/query';

import { MetadataTypeSelectSchema, MetadataQuerySchema, MetaDataQueryParamsSchema,
         GameMetadataSchema } from '#schema/game';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const metadata = new Hono();

// Given a list of metadata objects, try to insert any that are not currently in
// the database, and then return back a complete list of our internal records
// for all of the specified items.
metadata.put('/:metaType/update', validate('param', MetadataTypeSelectSchema),
                                   validate('json', GameMetadataSchema), ctx => _(ctx, metadataUpdateReq));

// Get the complete list of records for a specific type of metadata. T
metadata.get('/:metaType/list', validate('param', MetadataTypeSelectSchema), ctx => _(ctx, metadataListReq));

// Find all of the metadata entries of the given type that have no references to
// them by any game currently in the database and purge them away to clean up
// the lists.
metadata.get('/:metaType/purge', validate('param', MetadataTypeSelectSchema), ctx => _(ctx, metadataPurgeReq));
metadata.delete('/:metaType/purge', validate('param', MetadataTypeSelectSchema), ctx => _(ctx, metadataPurgeReq));

// Gather information about a specific metadata type, which includes the name
// and slug. This takes an optional "game" query argument, which will cause it
// to return details on each game that associates with that metadata item.
metadata.get('/:metaType/:idOrSlug', validate('param', MetadataQuerySchema),
                                      validate('query', MetaDataQueryParamsSchema), ctx => _(ctx, metadataQueryReq));


/******************************************************************************/

