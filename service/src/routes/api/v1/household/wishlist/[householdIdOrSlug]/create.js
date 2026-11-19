/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { HouseholdLookupIDSchema } from '#schema/household';
import { WishlistCreateSchema } from '#schema/wishlist';

import { householdAccess } from '#lib/household';
import { dbWishlistNameExists, dbWishlistCreate } from '#db/wishlist';


/******************************************************************************/


/* Attempt to create a new wishlist for a given household, using the provided
 * name. The slug is generated on the back end from that name. */
export const $put = routeHandler(
  validateZod('param', HouseholdLookupIDSchema),
  validateZod('json', WishlistCreateSchema),

  async (ctx) => {
    const { householdIdOrSlug } = ctx.req.valid('param');
    const { name } = ctx.req.valid('json');

    // Resolve the household and make sure the current user belongs to it.
    const access = await householdAccess(ctx, householdIdOrSlug);
    if (access.response !== undefined) {
      return access.response;
    }

    // Two lists with the same name would be indistinguishable in the picker, so
    // refuse a duplicate (matching case insensitively, like storage).
    if (await dbWishlistNameExists(ctx, access.household.id, name)) {
      return fail(ctx, `a wishlist named '${name}' already exists`, 409);
    }

    // Seems good, insert the wishlist now; this will always return a value back
    // since if it fails, an exception is thrown. The slug is generated from the
    // name by the database layer.
    const wishlist = await dbWishlistCreate(ctx, access.household.id, name);
    return success(ctx, `created new wishlist '${name}'`, wishlist);
  }
);


/******************************************************************************/
