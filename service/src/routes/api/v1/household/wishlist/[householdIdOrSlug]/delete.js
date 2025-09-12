/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';
import { WishlistDeleteSchema } from '#schema/wishlist';

import { dbHouseholdDetails } from '#db/household';
import { dbWishlistDetails, dbWishlistDelete } from '#db/wishlist';
import { dbGameDetails } from '#db/game';


/******************************************************************************/


/* Given information on a household and a wishlist for that household, remove
 * that wishlist and all of the games that are contained within it, if any. */
export const $delete = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),
  validateZod('json', WishlistDeleteSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');
    const { wishlist } = ctx.req.valid('json');

    // Try to find the household we want to remove the game from.
    const householdInfo = await dbHouseholdDetails(ctx, householdIdOrSlug);
    if (householdInfo === null) {
      return fail(ctx, `unable to locate household with id ${householdIdOrSlug}`, 404);
    }

    // Try to find a wishlist using this id for this household; if it does not
    // exist, we should complain.
    let wishlistData = await dbWishlistDetails(ctx, householdInfo.id, wishlist);
    if (wishlistData === null) {
      return fail(ctx, `unable to delete wishlist with id ${wishlist}; does not exist`, 400);
    }

    // It is not possible to delete a root wishlist from a household for the same
    // reason it is not possible to create one; there must always be exactly one,
    // and it is manipulated by the overall household code.
    if (wishlistData.isRoot === true) {
      return fail(ctx, `unable to delete wishlist with id ${wishlist}; cannot delete root wishlist`, 400);
    }

    // Trigger the deletion of the wishlist and its contents.
    await dbWishlistDelete(ctx, householdInfo.id, wishlistData.id);
    return success(ctx, `removed wishlist ${wishlist} from ${householdInfo.name}`);
  }
);


/******************************************************************************/
