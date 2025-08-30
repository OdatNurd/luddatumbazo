/******************************************************************************/


import { z } from 'zod';

import { numberOrString } from '#schema/common';


/******************************************************************************/


/* Operations to add a new game to a collection require a specification on the
 * game to be added, the ID of the name record to use as the owned name, and
 * an indication of the publisher of the copy of the game that is owned. */
export const CollectionAddGameSchema = z.object({
  game: z.string().or(z.number()).transform(numberOrString),
  name: z.string().or(z.number()).transform(numberOrString),
  publisher: z.string().or(z.number()).transform(numberOrString)
});


/******************************************************************************/


/* Operations to remove a game from a collection require a specification on the
 * game to be removed. */
export const CollectionRemoveGameSchema = z.object({
  game: z.string().or(z.number()).transform(numberOrString),
});


/******************************************************************************/
