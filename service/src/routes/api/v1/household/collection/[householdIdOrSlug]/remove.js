/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';
import { CollectionRemoveGameSchema } from '#schema/collection';

import { dbHouseholdDetails, dbHouseholdRemoveOwned } from '#db/household';
import { dbGameDetails } from '#db/game';


/******************************************************************************/


/* Given information on a game, attempt to remove that game from the collection
 * of a specific household. */
export const $delete = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),
  validateZod('json', CollectionRemoveGameSchema),


  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');
    const { game } = ctx.req.valid('json');

    // Try to find the household we want to remove the game from.
    const householdInfo = await dbHouseholdDetails(ctx, householdIdOrSlug);
    if (householdInfo === null) {
      return fail(ctx, `unable to locate household with id ${householdIdOrSlug}`, 404);
    }

    // Look up and validate the game that was specified in the request.
    const gameInfo = await dbGameDetails(ctx, game, householdInfo.id);
    if (gameInfo === null) {
      return fail(ctx, `unable to locate game with id ${game}`, 404);
    }

    // If this game is not already owned, then there is nothing else that needs to
    // be done.
    if (gameInfo.owned === undefined) {
      return fail(ctx, `game ${gameInfo.slug} is not owned by ${householdInfo.slug}`, 400);
    }

    const result = await dbHouseholdRemoveOwned(ctx, householdInfo.id, gameInfo.id);
    return success(ctx, `removed ${gameInfo.slug} from the collection for ${householdInfo.slug}`);
  }
);


/******************************************************************************/
