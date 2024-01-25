/******************************************************************************/


import { z } from 'zod';

import { asNumber } from '#schema/common';


/******************************************************************************/


/* When making requests to find users, a valid userId is required, or the
 * request does not know what data to ask for. */
export const UserIDSchema = z.object({
  userId: z.string().transform(asNumber(true))
});


/******************************************************************************/
