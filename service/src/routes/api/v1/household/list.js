/******************************************************************************/


import { routeHandler, success } from '@odatnurd/cf-requests';

import { dbHouseholdList } from '#db/household';


/******************************************************************************/


/* Return back a list of all of the households that are known to the system.
 * This can conceivably be an empty list. */
export const $get = routeHandler(
  async (ctx) => {
    const result = await dbHouseholdList(ctx);

    return success(ctx, `found ${result.length} households`, result);
  }
);


/******************************************************************************/
