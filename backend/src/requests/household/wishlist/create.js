/******************************************************************************/


import { success, fail } from '#requests/common';


import { dbHouseholdDetails, dbWishlistDetails, dbWishlistCreate } from '#db/household';


/******************************************************************************/


/* Attempt to create a new wishlist for a given hosuehold, using the name and
 * the slug provided for the record.
/* Given a name and optional slug for a new wishlist in a given household,
 * create the new wishlist and return it's data. */
export async function reqHouseholdWishlistCreate(ctx) {
  const { idOrSlug } = ctx.req.valid('param');
  const { name, slug } = ctx.req.valid('json');

  // Try to find the household that we want to create a wishlist in.
  const householdInfo = await dbHouseholdDetails(ctx, idOrSlug);
  if (householdInfo === null) {
    return fail(ctx, `unable to locate household with id ${idOrSlug}`, 404);
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
