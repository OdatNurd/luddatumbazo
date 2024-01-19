/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { MetadataTypeSelectSchema, MetadataQuerySchema, MetaDataQueryParamsSchema,
         GameMetadataSchema } from '#schema/game';

import { metadataUpdateReq } from '#requests/game/metadata/update';
import { metadataListReq } from '#requests/game/metadata/list';
import { metadataPurgeReq } from '#requests/game/metadata/purge';
import { metadataQueryReq } from '#requests/game/metadata/query';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const metadata = new Hono();


metadata.put('/:metaType/update',
             validate('param', MetadataTypeSelectSchema),
             validate('json', GameMetadataSchema),
             ctx => _(ctx, metadataUpdateReq));

metadata.get('/:metaType/list',
             validate('param', MetadataTypeSelectSchema),
             ctx => _(ctx, metadataListReq));

metadata.get('/:metaType/purge',
             validate('param', MetadataTypeSelectSchema),
             ctx => _(ctx, metadataPurgeReq));
metadata.delete('/:metaType/purge',
                validate('param', MetadataTypeSelectSchema),
                ctx => _(ctx, metadataPurgeReq));

metadata.get('/:metaType/:idOrSlug',
              validate('param', MetadataQuerySchema),
              validate('query', MetaDataQueryParamsSchema),
              ctx => _(ctx, metadataQueryReq));


/******************************************************************************/

