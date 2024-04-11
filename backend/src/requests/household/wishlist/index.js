/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { HouseholdLookupIDSchema } from '#schema/household';
import { WishlistAddGameSchema, WishlistRemoveGameSchema } from '#schema/wishlist';

import { reqHouseholdWishlist } from '#requests/household/wishlist/list';
import { reqHouseholdWishlistAdd } from '#requests/household/wishlist/insert';
import { reqHouseholdWishlistDelete } from '#requests/household/wishlist/delete';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const wishlist = new Hono();


wishlist.get('/:idOrSlug',
         validate('param', HouseholdLookupIDSchema),
         ctx => _(ctx, reqHouseholdWishlist));

wishlist.put('/:idOrSlug',
         validate('param', HouseholdLookupIDSchema),
         validate('json', WishlistAddGameSchema),
         ctx => _(ctx, reqHouseholdWishlistAdd));

wishlist.delete('/:idOrSlug',
         validate('param', HouseholdLookupIDSchema),
         validate('json', WishlistRemoveGameSchema),
         ctx => _(ctx, reqHouseholdWishlistDelete));


/******************************************************************************/
