/******************************************************************************/


import { success, fail } from '#requests/common';


import { dbHouseholdDetails } from '#db/household';
import { dbWishlistDetails, dbWishlistCreate } from '#db/wishlist';


/******************************************************************************/


/* Attempt to create a new wishlist for a given hosuehold, using the name and
 * the slug provided for the record. */
export async function reqHouseholdWishlistCreate(ctx) {
  const { householdIdOrSlug } = ctx.req.valid('param');
  const { name, slug } = ctx.req.valid('json');

  // Try to find the household that we want to create a wishlist in.
  const householdInfo = await dbHouseholdDetails(ctx, householdIdOrSlug);
  if (householdInfo === null) {
    return fail(ctx, `unable to locate household with id ${householdIdOrSlug}`, 404);
  }

  // Try to find a wishlist using this id for this household; if it exists, we
  // should complain right away.
  let wishlist = await dbWishlistDetails(ctx, householdInfo.id, slug);
  if (wishlist !== null) {
    return fail(ctx, `unable to create wishlist with id ${slug}; already exists`, 400);
  }

  // Seems good, insert the wishlist now; this will always return a value back
  // since if it fails, an exception is thrown.
  wishlist = await dbWishlistCreate(ctx, householdInfo.id, name, slug);
  return success(ctx, `created new wishlist '${name}'`, wishlist);
}


/******************************************************************************/
