/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';
import { WishlistRemoveGameSchema } from '#schema/wishlist';

import { householdAccess } from '#lib/household';
import { dbHouseholdRemoveWishlisted } from '#db/household';
import { dbGameDetails } from '#db/game';


/******************************************************************************/


/* Given information on a game, attempt to remove that game from the wishlist
 * of a specific household. */
export const $delete = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),
  validateZod('json', WishlistRemoveGameSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');
    const { game } = ctx.req.valid('json');

    // Resolve the household and make sure the current user belongs to it.
    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    // Look up and validate the game that was specified in the request.
    const gameInfo = await dbGameDetails(ctx, game, access.household.id);
    if (gameInfo === null) {
      return fail(ctx, `unable to locate game with id ${game}`, 404);
    }

    // If this game is not wishlisted, then there is nothing else that needs to
    // be done.
    if (gameInfo.wishlist === undefined) {
      return fail(ctx, `game ${gameInfo.slug} is not wishlisted by ${access.household.slug}`, 400);
    }

    await dbHouseholdRemoveWishlisted(ctx, access.household.id, gameInfo.id);
    return success(ctx, `removed ${gameInfo.slug} from the wishlist for ${access.household.slug}`);
  }
);


/******************************************************************************/
