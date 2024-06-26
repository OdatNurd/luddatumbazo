/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { HouseholdLookupIDSchema } from '#schema/household';
import { WishlistContentsIDSchema, WishlistCreateSchema, WishlistDeleteSchema, WishlistAddGameSchema, WishlistRemoveGameSchema } from '#schema/wishlist';

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

wishlist.put('/:householdIdOrSlug/create',
         validate('param', HouseholdLookupIDSchema),
         validate('json', WishlistCreateSchema),
         ctx => _(ctx, reqHouseholdWishlistCreate));

wishlist.delete('/:householdIdOrSlug/delete',
         validate('param', HouseholdLookupIDSchema),
         validate('json', WishlistDeleteSchema),
         ctx => _(ctx, reqHouseholdWishlistDelete));

wishlist.get('/:householdIdOrSlug/list',
         validate('param', HouseholdLookupIDSchema),
         ctx => _(ctx, reqHouseholdWishlistList));


/* Manipulating the contents of a wishlist */

wishlist.put('/:householdIdOrSlug/add/:wishlistIdOrSlug',
         validate('param', WishlistContentsIDSchema),
         validate('json', WishlistAddGameSchema),
         ctx => _(ctx, reqHouseholdWishlistAdd));

wishlist.delete('/:householdIdOrSlug/remove',
         validate('param', HouseholdLookupIDSchema),
         validate('json', WishlistRemoveGameSchema),
         ctx => _(ctx, reqHouseholdWishlistRemove));

wishlist.get('/:householdIdOrSlug/contents/:wishlistIdOrSlug',
         validate('param', WishlistContentsIDSchema),
         ctx => _(ctx, reqHouseholdWishlistContents));


/******************************************************************************/
