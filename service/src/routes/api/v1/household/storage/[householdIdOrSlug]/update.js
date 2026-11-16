/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';
import { StorageUpdateSchema } from '#schema/storage';

import { householdAccess } from '#lib/household';
import {
  dbStorageDetails, dbStorageSiblingExists, dbStorageUpdate
} from '#db/storage';


/******************************************************************************/


/* Rename a storage location. Reparenting is deliberately not supported in
 * this version. */
export const $put = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),
  validateZod('json', StorageUpdateSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');
    const { storageId, name } = ctx.req.valid('json');

    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    const location = await dbStorageDetails(ctx, access.household.id, storageId);
    if (location === null) {
      return fail(ctx, `unable to locate storage location ${storageId}`, 404);
    }

    if (await dbStorageSiblingExists(ctx, access.household.id, location.parentId, name, storageId)) {
      return fail(ctx, `a storage location named '${name}' already exists here`, 409);
    }

    const result = await dbStorageUpdate(ctx, access.household.id, storageId, name);
    return success(ctx, `renamed storage location ${storageId}`, result);
  }
);


/******************************************************************************/
