/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { OptionalBGGGameIDSchema } from '#schema/bgg';

import { imageUploadReq } from '#requests/image/upload';
import { imageVariantsReq } from '#requests/image/variants';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const image = new Hono();


image.get('/variants', ctx => _(ctx, imageVariantsReq));

image.get('/:bggId?',
          validate('param', OptionalBGGGameIDSchema),
          ctx => _(ctx, imageUploadReq));


/******************************************************************************/
