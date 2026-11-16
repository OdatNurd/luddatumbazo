/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';
import { StorageDeleteSchema } from '#schema/storage';

import { householdAccess } from '#lib/household';
import { dbStorageDelete, dbStorageDetails, dbStorageUsage } from '#db/storage';


/******************************************************************************/


/* Delete an empty storage location. Locations that still contain children or
 * assigned games are refused so that a delete cannot silently lose the
 * household's physical organization. */
export const $delete = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),
  validateZod('json', StorageDeleteSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');
    const { storageId } = ctx.req.valid('json');

    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    const location = await dbStorageDetails(ctx, access.household.id, storageId);
    if (location === null) {
      return fail(ctx, `unable to locate storage location ${storageId}`, 404);
    }

    const usage = await dbStorageUsage(ctx, access.household.id, storageId);
    if (usage.childCount !== 0) {
      return fail(ctx, `storage location '${location.name}' still contains ${usage.childCount} sub-locations`, 409);
    }

    if (usage.gameCount !== 0) {
      return fail(ctx, `storage location '${location.name}' still contains ${usage.gameCount} games`, 409);
    }

    await dbStorageDelete(ctx, access.household.id, storageId);
    return success(ctx, `removed storage location '${location.name}'`);
  }
);


/******************************************************************************/
