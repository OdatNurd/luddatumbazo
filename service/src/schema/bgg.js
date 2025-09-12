/******************************************************************************/


import { z } from 'zod';

import { asNumber } from '#schema/common';


/******************************************************************************/


/* When making a request, a valid BoardGameGeek ID is required, or the request
 * does not know what data to ask for. */
export const BGGGameIDSchema = z.object({
  bggId: z.string().transform(asNumber(true))
});


/******************************************************************************/


/* When running the image endpoint, the only paramter is an optional BGG Game ID
 * to be used to determine how many images should be uploaded.
 *
 * If the value is not present, it is returned as undefined instead. */
export const OptionalBGGGameIDSchema = z.object({
  bggId: z.number().optional()
});


/******************************************************************************/