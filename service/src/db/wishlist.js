/******************************************************************************/


import { getDBResult, mapIntFieldsToBool } from '#db/common';


/******************************************************************************/


/* Return details on the wishlist owned by the provided householdId, looking up
 * the wishlist via either it's textual slug or it's numeric ID.
 *
 * If such a wishlist is not found, null is returned. Otherwise, the result is
 * information on that particular wishist. */
export async function dbWishlistDetails(ctx, householdId, idOrSlug) {
  const wishlistLookup = await ctx.env.DB.prepare(`
    SELECT * FROM Wishlist
     WHERE (id == ?1 or slug == ?1) AND householdId = ?2
  `).bind(idOrSlug, householdId).all();
  const wishlistInfo = getDBResult('dbWishlistDetails', 'find_wishlist', wishlistLookup);

  // If that returned no results, we can leave now.
  if (wishlistInfo.length === 0) {
    return null;
  }

  return mapIntFieldsToBool(wishlistInfo[0]);
}


/******************************************************************************/


/* Return the list of all wishlists that are associated with the provided
 * householdId. */
export async function dbWishlistList(ctx, householdId) {
  const wishlistLookup = await ctx.env.DB.prepare(`
    SELECT * FROM Wishlist WHERE householdId = ?
  `).bind(householdId).all();

  const wishlists = getDBResult('dbWishlistList', 'list_wishlists', wishlistLookup);
  return wishlists.map(entry => mapIntFieldsToBool(entry))
}


/******************************************************************************/


/* Create a new wishlsit with the given name and slug, associated with the
 * provided householdId.
 *
 * NOTE: All wishlists that are created by this method are always non-root, as
 *       there should only ever be one root wishlist, and that is created at the
 *       time the household is created initially.
 *
 * Details on the new wishlist will be returned back. */
export async function dbWishlistCreate(ctx, householdId, name, slug) {
  const result = await ctx.env.DB.prepare(`
    INSERT INTO Wishlist
      (householdId, name, slug)
    VALUES (?1, ?2, ?3);
  `).bind(householdId, name, slug).all();

  // Display the results of the creation
  getDBResult('dbWishlistCreate', 'create', result);

  // Return the new record back; all data here is known except for the ID, which
  // comes from the insert.
  return {
    id: result.meta.last_row_id,
    householdId,
    name,
    slug,
    isRoot: false
  }
}


/******************************************************************************/


/* Given a household and the ID of a wishlist within that household, remove that
 * wishlist from the database.
 *
 * All entries for games within that wishlist are removed from the list, if
 * there are any. */
export async function dbWishlistDelete(ctx, householdId, wishlistId) {
  const stmts = [
    ctx.env.DB.prepare(`
      DELETE FROM WishlistContents
       WHERE householdId = ?1 AND wishlistId = ?2;
    `).bind(householdId, wishlistId),

    ctx.env.DB.prepare(`
      DELETE FROM Wishlist
       WHERE householdId = ?1 AND id = ?2 AND isRoot = 0;
    `).bind(householdId, wishlistId),
  ];

  const result = await ctx.env.DB.batch(stmts);
  getDBResult('dbWishlistDelete', 'delete', result);
}


/******************************************************************************/
