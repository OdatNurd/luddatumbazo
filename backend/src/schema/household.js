/******************************************************************************/


import { z } from 'zod';

import { numberOrString } from '#schema/common';



/******************************************************************************/


/* Operations to create a household require a textual name and a textual slug in
 * the body of the request. */
export const HouseholdCreateSchema = z.object({
    name: z.string(),
    slug: z.string(),
});


/******************************************************************************/


/* Operations to look up households can take as a search parameter either a
 * numeric id value of the household, or a string slug. */
export const HouseholdLookupIDSchema = z.object({
  idOrSlug: z.string().transform(numberOrString)
});


/******************************************************************************/
