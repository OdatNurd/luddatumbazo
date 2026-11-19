/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';
import { WishlistUpdateSchema } from '#schema/wishlist';

import { householdAccess } from '#lib/household';
import {
  dbWishlistDetails, dbWishlistNameExists, dbWishlistUpdate
} from '#db/wishlist';


/******************************************************************************/


/* Rename a wishlist. The wishlist slug is its stable page address and is not
 * changed by a rename, matching the storage location behaviour. */
export const $put = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),
  validateZod('json', WishlistUpdateSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');
    const { wishlist, name } = ctx.req.valid('json');

    // Resolve the household and make sure the current user belongs to it.
    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    // The list must exist in this household before it can be renamed.
    const wishlistData = await dbWishlistDetails(ctx, access.household.id, wishlist);
    if (wishlistData === null) {
      return fail(ctx, `unable to rename wishlist with id ${wishlist}; does not exist`, 404);
    }

    // Keep names distinguishable in the picker, excluding the list itself so
    // that saving an unchanged name is allowed.
    if (await dbWishlistNameExists(ctx, access.household.id, name, wishlistData.id)) {
      return fail(ctx, `a wishlist named '${name}' already exists`, 409);
    }

    const result = await dbWishlistUpdate(ctx, access.household.id, wishlistData.id, name);
    return success(ctx, `renamed wishlist '${wishlistData.name}' to '${name}'`, result);
  }
);


/******************************************************************************/
