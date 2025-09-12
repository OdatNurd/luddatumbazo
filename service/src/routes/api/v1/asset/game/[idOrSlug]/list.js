/******************************************************************************/


import { routeHandler } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { GameLookupIDSchema } from "#schema/game";

import { handler } from '#routes/api/v1/asset/list';


/******************************************************************************/


/* Handle a request to find the assets for a game that is specified directly
 * in the route as an idOrSlug path segment. */
export const $get = routeHandler(
  validateZod('param', GameLookupIDSchema),

  handler
);


/******************************************************************************/