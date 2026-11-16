/******************************************************************************/


import { routeHandler, success } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';
import { StorageShelfSchema } from '#schema/storage';

import { householdAccess } from '#lib/household';
import { dbStorageSetShelf } from '#db/storage';


/******************************************************************************/


/* Change the shelf state of several games at once. A game must already have a
 * storage location to take part; Unstored games are ignored. This backs both
 * reshelving and the storage-contents "take off shelf" selection mode. */
export const $put = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),
  validateZod('json', StorageShelfSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');
    const { gameIds, isOnShelf } = ctx.req.valid('json');

    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    const updated = await dbStorageSetShelf(
      ctx, access.household.id, gameIds, isOnShelf
    );

    return success(
      ctx,
      `${updated} games marked ${isOnShelf ? 'on' : 'off'} shelf`,
      { updated, isOnShelf }
    );
  }
);


/******************************************************************************/