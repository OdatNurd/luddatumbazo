/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { GameLookupIDSchema } from "#schema/game";
import { AssetUploadSchema, AssetDeleteSchema } from '#schema/asset';

import { reqGameAssetUpload } from '#requests/asset/upload';
import { reqGameAssetDelete } from '#requests/asset/delete';
import { reqGameAssetList } from '#requests/asset/list';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const asset = new Hono();


asset.get('/list',
        ctx => _(ctx, reqGameAssetList));

asset.get('/game/:idOrSlug/list',
        validate('param', GameLookupIDSchema),
        ctx => _(ctx, reqGameAssetList));

asset.post('/game/:idOrSlug/upload',
        validate('param', GameLookupIDSchema),
        validate('form', AssetUploadSchema),
        ctx => _(ctx, reqGameAssetUpload));

asset.delete('/',
        validate('json', AssetDeleteSchema),
        ctx => _(ctx, reqGameAssetDelete));

/******************************************************************************/
