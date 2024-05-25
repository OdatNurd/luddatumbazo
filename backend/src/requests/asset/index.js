/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { GameLookupIDSchema } from "#schema/game";
import { AssetUploadSchema } from '#schema/asset';

import { reqGameAssetUpload } from '#requests/asset/upload';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const asset = new Hono();


asset.post('/game/:idOrSlug/upload',
        validate('param', GameLookupIDSchema),
        validate('form', AssetUploadSchema),
        ctx => _(ctx, reqGameAssetUpload));


/******************************************************************************/
