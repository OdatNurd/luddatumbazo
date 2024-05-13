/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { HouseholdLookupIDSchema } from '#schema/household';
import { WishlistCreateSchema, WishlistDeleteSchema, WishlistAddGameSchema, WishlistRemoveGameSchema } from '#schema/wishlist';

import { reqHouseholdWishlistCreate } from '#requests/household/wishlist/create';
import { reqHouseholdWishlistDelete } from '#requests/household/wishlist/delete';
import { reqHouseholdWishlistList } from '#requests/household/wishlist/list';

import { reqHouseholdWishlistContents } from '#requests/household/wishlist/contents';
import { reqHouseholdWishlistAdd } from '#requests/household/wishlist/add';
import { reqHouseholdWishlistRemove } from '#requests/household/wishlist/remove';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const wishlist = new Hono();


/* Manipulating the list of wishlists. */

wishlist.put('/:idOrSlug/create',
         validate('param', HouseholdLookupIDSchema),
         validate('json', WishlistCreateSchema),
         ctx => _(ctx, reqHouseholdWishlistCreate));

wishlist.delete('/:idOrSlug/delete',
         validate('param', HouseholdLookupIDSchema),
         validate('json', WishlistDeleteSchema),
         ctx => _(ctx, reqHouseholdWishlistDelete));

wishlist.get('/:idOrSlug/list',
         validate('param', HouseholdLookupIDSchema),
         ctx => _(ctx, reqHouseholdWishlistList));


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
