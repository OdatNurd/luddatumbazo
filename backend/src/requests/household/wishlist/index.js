/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { HouseholdLookupIDSchema } from '#schema/household';
import { WishlistAddGameSchema, WishlistRemoveGameSchema } from '#schema/wishlist';

import { reqHouseholdWishlistContents } from '#requests/household/wishlist/contents';
import { reqHouseholdWishlistAdd } from '#requests/household/wishlist/add';
import { reqHouseholdWishlistRemove } from '#requests/household/wishlist/remove';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const wishlist = new Hono();


/* Manipulating the contents of a wishlist */

wishlist.put('/:idOrSlug/add',
         validate('param', HouseholdLookupIDSchema),
         validate('json', WishlistAddGameSchema),
         ctx => _(ctx, reqHouseholdWishlistAdd));

wishlist.delete('/:idOrSlug/remove',
         validate('param', HouseholdLookupIDSchema),
         validate('json', WishlistRemoveGameSchema),
         ctx => _(ctx, reqHouseholdWishlistRemove));

wishlist.get('/:idOrSlug/contents',
         validate('param', HouseholdLookupIDSchema),
         ctx => _(ctx, reqHouseholdWishlistContents));


/******************************************************************************/
