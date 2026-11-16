/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';
import { StorageAssignSchema } from '#schema/storage';

import { householdAccess } from '#lib/household';
import { dbGameDetails, dbGameHouseholdSpecifics } from '#db/game';
import { dbStorageAssign, dbStorageDetails } from '#db/storage';


/******************************************************************************/


/* Assign an owned game to a storage location, mark it off shelf while keeping
 * its location, or clear the location entirely.
 *
 * A null location is the virtual Unstored bucket. It is invalid to mark an
 * unstored game as on shelf; the UI always clears the switch in that case, and
 * this route refuses the combination as well. */
export const $put = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),
  validateZod('json', StorageAssignSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');
    const { game, storageLocationId, isOnShelf } = ctx.req.valid('json');

    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    const gameInfo = await dbGameDetails(ctx, game, access.household.id);
    if (gameInfo === null) {
      return fail(ctx, `unable to locate game with id ${game}`, 404);
    }

    if (gameInfo.owned === undefined) {
      return fail(ctx, `game ${gameInfo.slug} is not owned by ${access.household.slug}`, 400);
    }

    if (storageLocationId !== null) {
      const location = await dbStorageDetails(ctx, access.household.id, storageLocationId);
      if (location === null) {
        return fail(ctx, `unable to locate storage location ${storageLocationId}`, 400);
      }
    }

    if (storageLocationId === null && isOnShelf === true) {
      return fail(ctx, 'a game without a storage location cannot be on shelf', 400);
    }

    const updated = await dbStorageAssign(
      ctx, access.household.id, gameInfo.id,
      storageLocationId, isOnShelf
    );

    if (updated === false) {
      return fail(ctx, `unable to update storage for ${gameInfo.slug}`, 500);
    }

    const result = await dbGameHouseholdSpecifics(
      ctx, true, gameInfo.id, access.household.id
    );

    return success(ctx, `updated storage for ${gameInfo.slug}`, result);
  }
);


/******************************************************************************/
