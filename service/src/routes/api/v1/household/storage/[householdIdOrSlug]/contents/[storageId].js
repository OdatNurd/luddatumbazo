/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import {
  StorageContentsIDSchema, StorageContentsQuerySchema
} from '#schema/storage';

import { householdAccess } from '#lib/household';
import { dbStorageContents, dbStorageDetails } from '#db/storage';


/******************************************************************************/


/* Return the games stored directly in a location. Passing includeChildren=1
 * extends the result to every location underneath it. */
export const $get = routeHandler(
  validateZod('param', StorageContentsIDSchema),
  validateZod('query', StorageContentsQuerySchema),

  async (ctx) => {
    const { householdIdOrSlug, storageId } = ctx.req.valid('param');
    const { includeChildren } = ctx.req.valid('query');

    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    const location = await dbStorageDetails(ctx, access.household.id, storageId);
    if (location === null) {
      return fail(ctx, `unable to locate storage location ${storageId}`, 404);
    }

    const result = await dbStorageContents(
      ctx, access.household.id, location.id, includeChildren === '1'
    );

    return success(
      ctx,
      `found ${result.length} games in storage location ${location.id}`,
      result
    );
  }
);


/******************************************************************************/
