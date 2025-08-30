/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { MetadataTypeSelectSchema, MetadataQuerySchema, MetaDataQueryParamsSchema,
         GameMetadataSchema } from '#schema/game';

import { reqMetadataUpdate } from '#requests/game/metadata/update';
import { reqMetadataList } from '#requests/game/metadata/list';
import { reqMetadataPurge } from '#requests/game/metadata/purge';
import { reqMetadataQuery } from '#requests/game/metadata/query';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const metadata = new Hono();


metadata.put('/:metaType/update',
             validate('param', MetadataTypeSelectSchema),
             validate('json', GameMetadataSchema),
             ctx => _(ctx, reqMetadataUpdate));

metadata.get('/:metaType/list',
             validate('param', MetadataTypeSelectSchema),
             ctx => _(ctx, reqMetadataList));

metadata.get('/:metaType/purge',
             validate('param', MetadataTypeSelectSchema),
             ctx => _(ctx, reqMetadataPurge));
metadata.delete('/:metaType/purge',
                validate('param', MetadataTypeSelectSchema),
                ctx => _(ctx, reqMetadataPurge));

metadata.get('/:metaType/:idOrSlug',
              validate('param', MetadataQuerySchema),
              validate('query', MetaDataQueryParamsSchema),
              ctx => _(ctx, reqMetadataQuery));


/******************************************************************************/

