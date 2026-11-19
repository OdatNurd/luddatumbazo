/******************************************************************************/


import slugify from 'slug';

import { getDBResult, mapIntFieldsToBool } from '#db/common';


/******************************************************************************/


/* Return details on the wishlist owned by the provided householdId, looking up
 * the wishlist via either its textual slug or its numeric ID. The result
 * includes the number of games the wishlist currently contains.
 *
 * If such a wishlist is not found, null is returned. Otherwise, the result is
 * information on that particular wishlist. */
export async function dbWishlistDetails(ctx, householdId, idOrSlug) {
  const wishlistLookup = await ctx.env.DB.prepare(`
    SELECT W.*,
           (SELECT COUNT(*) FROM WishlistContents AS C
             WHERE C.wishlistId = W.id) AS gameCount
      FROM Wishlist AS W
     WHERE (W.id == ?1 or W.slug == ?1) AND W.householdId = ?2
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
 * householdId, including how many games each one contains. The household's root
 * wishlist is returned first. */
export async function dbWishlistList(ctx, householdId) {
  const wishlistLookup = await ctx.env.DB.prepare(`
    SELECT W.*,
           (SELECT COUNT(*) FROM WishlistContents AS C
             WHERE C.wishlistId = W.id) AS gameCount
      FROM Wishlist AS W
     WHERE W.householdId = ?
     ORDER BY W.isRoot DESC, W.name COLLATE NOCASE
  `).bind(householdId).all();

  const wishlists = getDBResult('dbWishlistList', 'list_wishlists', wishlistLookup);
  return wishlists.map(entry => mapIntFieldsToBool(entry))
}


/******************************************************************************/


/* Build the immutable slug for a new wishlist. The slug is derived from the
 * name when the list is created and is not touched by later renames, so an
 * existing link keeps identifying the same list. A purely numeric result is
 * prefixed because a numeric route value is interpreted as an ID rather than a
 * slug. */
function wishlistSlugBase(name) {
  const base = slugify(name) || 'wishlist';

  return (/^\d+$/.test(base) ? `wishlist-${base}` : base);
}


/******************************************************************************/


/* Find a slug that is not already used by another wishlist in the household.
 * Different names can normalize to the same slug, so append a counter when
 * necessary. */
async function uniqueWishlistSlug(ctx, householdId, base) {
  let candidate = base;
  let counter = 1;

  while (true) {
    const lookup = await ctx.env.DB.prepare(`
      SELECT id
        FROM Wishlist
       WHERE householdId = ?1
         AND slug = ?2
       LIMIT 1
    `).bind(householdId, candidate).all();

    if (getDBResult('uniqueWishlistSlug', 'find_slug', lookup).length === 0) {
      return candidate;
    }

    counter += 1;
    candidate = `${base}-${counter}`;
  }
}


/******************************************************************************/


/* Check whether the household already has a wishlist with the given name.
 * Passing an excludeId allows a rename to keep its own current name. */
export async function dbWishlistNameExists(ctx, householdId, name, excludeId = null) {
  const lookup = await ctx.env.DB.prepare(`
    SELECT id
      FROM Wishlist
     WHERE householdId = ?1
       AND name = ?2 COLLATE NOCASE
       AND (?3 IS NULL OR id <> ?3)
     LIMIT 1
  `).bind(householdId, name, excludeId).all();

  return getDBResult('dbWishlistNameExists', 'find_wishlist_name', lookup).length !== 0;
}


/******************************************************************************/


/* Create a new wishlist with the given name, associated with the provided
 * householdId. The slug is generated here from the name; callers do not supply
 * one.
 *
 * NOTE: All wishlists that are created by this method are always non-root, as
 *       there should only ever be one root wishlist, and that is created at the
 *       time the household is created initially.
 *
 * Details on the new wishlist will be returned back. */
export async function dbWishlistCreate(ctx, householdId, name) {
  const slug = await uniqueWishlistSlug(ctx, householdId, wishlistSlugBase(name));

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


/* Rename an existing wishlist. Only the display name changes; the slug is part
 * of the list's stable page address and is deliberately left alone. */
export async function dbWishlistUpdate(ctx, householdId, wishlistId, name) {
  const result = await ctx.env.DB.prepare(`
    UPDATE Wishlist
       SET name = ?1
     WHERE id = ?2
       AND householdId = ?3;
  `).bind(name, wishlistId, householdId).all();

  getDBResult('dbWishlistUpdate', 'update_wishlist', result);

  return await dbWishlistDetails(ctx, householdId, wishlistId);
}


/******************************************************************************/


/* Given a household and the ID of a wishlist within that household, remove that
 * wishlist from the database.
 *
 * The caller is responsible for ensuring the wishlist is empty. This function
 * deliberately does not remove WishlistContents, so a non-empty wishlist is
 * refused by the foreign key instead of silently losing its games. */
export async function dbWishlistDelete(ctx, householdId, wishlistId) {
  const result = await ctx.env.DB.prepare(`
    DELETE FROM Wishlist
     WHERE householdId = ?1 AND id = ?2 AND isRoot = 0;
  `).bind(householdId, wishlistId).all();

  getDBResult('dbWishlistDelete', 'delete', result);
}


/******************************************************************************/
