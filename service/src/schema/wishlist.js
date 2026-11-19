/******************************************************************************/


import { z } from 'zod';

import { numberOrString } from '#schema/common';


/******************************************************************************/


/* When looking up the list of wishlists or adding entries to them, we require
 * a household and a wishlist to look up. */
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


/* A wishlist name is the only user supplied value; the slug is derived from it
 * on the back end when the list is created. */
const WishlistNameSchema = z.string().trim().min(1).max(80);


/******************************************************************************/


/* Operations to create a wishlist require only a textual name in the body of
 * the request. */
export const WishlistCreateSchema = z.object({
  name: WishlistNameSchema,
});


/******************************************************************************/


/* Renaming a wishlist identifies the list by ID or slug and supplies the new
 * display name. The slug itself is never changed. */
export const WishlistUpdateSchema = z.object({
  wishlist: z.string().or(z.number()).transform(numberOrString),
  name: WishlistNameSchema,
});


/******************************************************************************/


/* Operations to remove a wishlist from a household require a specification on
 * the wishlist to be removed. */
export const WishlistDeleteSchema = z.object({
  wishlist: z.string().or(z.number()).transform(numberOrString),
});


/******************************************************************************/
