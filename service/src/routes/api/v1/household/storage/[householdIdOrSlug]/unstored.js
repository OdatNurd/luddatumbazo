/******************************************************************************/


import { routeHandler, success } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';

import { householdAccess } from '#lib/household';
import { dbStorageUnstored } from '#db/storage';


/******************************************************************************/


/* Return the games that do not have a storage location yet. */
export const $get = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');

    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    const result = await dbStorageUnstored(ctx, access.household.id);
    return success(ctx, `found ${result.length} unstored games`, result);
  }
);


/******************************************************************************/
