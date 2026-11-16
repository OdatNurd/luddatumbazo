/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';
import { StorageBulkLocationSchema } from '#schema/storage';

import { householdAccess } from '#lib/household';
import { dbStorageAssignMany, dbStorageDetails } from '#db/storage';


/******************************************************************************/


/* Move several games to a storage location at once. This backs both assigning
 * a batch of Unstored games and consolidating games from a storage page. */
export const $put = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),
  validateZod('json', StorageBulkLocationSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');
    const { gameIds, storageLocationId } = ctx.req.valid('json');

    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    const location = await dbStorageDetails(ctx, access.household.id, storageLocationId);
    if (location === null) {
      return fail(ctx, `unable to locate storage location ${storageLocationId}`, 400);
    }

    const updated = await dbStorageAssignMany(
      ctx, access.household.id, gameIds, storageLocationId
    );

    return success(
      ctx,
      `${updated} games moved to ${location.slug}`,
      { updated, storageLocationId }
    );
  }
);


/******************************************************************************/
