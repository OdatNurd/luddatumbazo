/******************************************************************************/


import { z } from 'zod';

import { numberOrString } from '#schema/common';


/******************************************************************************/


/* Operations to look up households can take as a search parameter either a
 * numeric id value of the household, or a string slug. */
export const HouseholdLookupIDSchema = z.object({
  idOrSlug: z.string().transform(numberOrString)
});


/******************************************************************************/
