/******************************************************************************/


import { z } from 'zod';

import { numberOrString } from '#schema/common';


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
