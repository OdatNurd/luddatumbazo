/******************************************************************************/


import { z } from 'zod';

import { numberOrString } from '#schema/common';


/******************************************************************************/


/* When looking up the list of wishlists, we require a household and a wishlist
 * to look up. */
export const WishlistContentsIDSchema = z.object({
  householdIdOrSlug: z.string().transform(numberOrString),
  wishlistIdOrSlug: z.string().transform(numberOrString),
});


/******************************************************************************/


/* Operations to add a new game to a wishlist require a specification on the
 * game to be added and the ID of the name record to use as the owned name. */
export const WishlistAddGameSchema = z.object({
  game: z.string().or(z.number()).transform(numberOrString),
  name: z.string().or(z.number()).transform(numberOrString)
});


/******************************************************************************/


/* Operations to remove a game from a wishlist require a specification on the
 * game to be removed. */
export const WishlistRemoveGameSchema = z.object({
  game: z.string().or(z.number()).transform(numberOrString),
});


/******************************************************************************/


/* Operations to create a wishlist require a textual name and a textual slug in
 * the body of the request.
/* Operations to remove a game from a wishlist require a specification on the
 * game to be removed. */
export const WishlistCreateSchema = z.object({
    name: z.string(),
    slug: z.string(),
});


/******************************************************************************/


/* Operations to remove a wishlist from a household require a specification on
 * the wishlist to be removed. */
export const WishlistDeleteSchema = z.object({
  wishlist: z.string().or(z.number()).transform(numberOrString),
});


/******************************************************************************/
