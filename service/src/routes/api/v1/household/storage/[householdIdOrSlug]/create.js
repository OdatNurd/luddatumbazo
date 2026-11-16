/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';
import { StorageCreateSchema } from '#schema/storage';

import { householdAccess } from '#lib/household';
import {
  dbStorageCreate, dbStorageDetails, dbStorageSiblingExists
} from '#db/storage';


/******************************************************************************/


/* Create a storage location, optionally underneath a parent in the same
 * household. */
export const $put = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),
  validateZod('json', StorageCreateSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');
    const { name, parentId } = ctx.req.valid('json');

    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    if (parentId !== null && parentId !== undefined) {
      const parent = await dbStorageDetails(ctx, access.household.id, parentId);
      if (parent === null) {
        return fail(ctx, `unable to locate parent storage location ${parentId}`, 400);
      }
    }

    if (await dbStorageSiblingExists(ctx, access.household.id, parentId, name)) {
      return fail(ctx, `a storage location named '${name}' already exists here`, 409);
    }

    const result = await dbStorageCreate(ctx, access.household.id, name, parentId);
    return success(ctx, `created storage location '${name}'`, result);
  }
);


/******************************************************************************/
