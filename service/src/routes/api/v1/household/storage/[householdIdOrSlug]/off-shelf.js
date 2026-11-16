/******************************************************************************/


import { routeHandler, success } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';

import { householdAccess } from '#lib/household';
import { dbStorageOffShelf } from '#db/storage';


/******************************************************************************/


/* Return the games that have a storage location but are currently off shelf.
 * These are the games the reshelving page offers to put back. */
export const $get = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');

    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    const result = await dbStorageOffShelf(ctx, access.household.id);
    return success(ctx, `found ${result.length} off shelf games`, result);
  }
);


/******************************************************************************/