/******************************************************************************/


import { routeHandler, success } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';

import { householdAccess } from '#lib/household';
import { dbStorageList } from '#db/storage';


/******************************************************************************/


/* Return the storage tree for a household, along with the Unstored and
 * off-shelf counts shown above it in the UI. */
export const $get = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');

    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    const result = await dbStorageList(ctx, access.household.id);
    return success(ctx, `found ${result.locations.length} storage locations`, result);
  }
);


/******************************************************************************/
