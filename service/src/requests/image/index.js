/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { OptionalBGGGameIDSchema } from '#schema/bgg';

import { reqImageUpload } from '#requests/image/upload';
import { reqImageVariants } from '#requests/image/variants';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const image = new Hono();


image.get('/variants', ctx => _(ctx, reqImageVariants));

image.get('/:bggId?',
          validate('param', OptionalBGGGameIDSchema),
          ctx => _(ctx, reqImageUpload));


/******************************************************************************/
