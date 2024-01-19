/******************************************************************************/


import { z } from 'zod';
import { makeDisplayName } from '#db/common';


/******************************************************************************/


/* When adding new guests to the system, the only data that's required is the
 * first and last name of the guest to be added. No other fields (including
 * name) are valid in this context. */
export const NewGuestSchema = z.array(
  z.object({
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().default('')
  }).transform((value, zCtx) => {
    if (value.displayName === '') {
      value.displayName = makeDisplayName(value.firstName, value.lastName);
    }

    return value;
  })
);


/******************************************************************************/

