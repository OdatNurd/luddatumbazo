/******************************************************************************/


import { getDBResult } from '#db/common';
import { imgMapAssetListURLs } from '#lib/image';


/******************************************************************************/


/* Build a display tree from the flat storage rows returned by the database.
 *
 * Each row is annotated with its path, depth and total game count (including
 * games assigned anywhere below it). The API returns a flat list so the client
 * can render a tree without needing a recursive component. */
function buildStorageTree(rows) {
  const byId = new Map(rows.map(row => [
    row.id,
    {
      ...row,
      gameCount: Number(row.gameCount) || 0,
      children: []
    }
  ]));

  const roots = [];

  for (const row of byId.values()) {
    const parent = (row.parentId === null) ? null : byId.get(row.parentId);

    if (parent === undefined || parent === null) {
      roots.push(row);
    } else {
      parent.children.push(row);
    }
  }

  const sortNodes = nodes => {
    nodes.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
    nodes.forEach(node => sortNodes(node.children));
  };

  sortNodes(roots);

  const pathFor = row => {
    const parts = [];
    const seen = new Set();
    let current = row;

    while (current !== null && current !== undefined && seen.has(current.id) === false) {
      seen.add(current.id);
      parts.unshift(current.name);
      current = (current.parentId === null) ? null : byId.get(current.parentId);
    }

    return parts.join(' / ');
  };

  const totalFor = (row, seen = new Set()) => {
    if (seen.has(row.id)) {
      return 0;
    }

    seen.add(row.id);

    return row.gameCount + row.children.reduce(
      (total, child) => total + totalFor(child, seen),
      0
    );
  };

  const result = [];

  const visit = (row, depth) => {
    result.push({
      id: row.id,
      householdId: row.householdId,
      parentId: row.parentId,
      name: row.name,
      gameCount: row.gameCount,
      totalGameCount: totalFor(row),
      depth,
      path: pathFor(row)
    });

    row.children.forEach(child => visit(child, depth + 1));
  };

  roots.forEach(root => visit(root, 0));

  return result;
}


/******************************************************************************/


/* Return the storage tree for a household, plus the two virtual counts that
 * sit above it: games with no location (Unstored) and games with a location
 * but currently marked off shelf. */
export async function dbStorageList(ctx, householdId) {
  const locationsLookup = await ctx.env.DB.prepare(`
    SELECT S.id, S.householdId, S.parentId, S.name,
           COUNT(G.id) AS gameCount
      FROM StorageLocation AS S
      LEFT JOIN GameOwners AS G
        ON G.storageLocationId = S.id
       AND G.householdId = S.householdId
     WHERE S.householdId = ?1
     GROUP BY S.id
     ORDER BY S.name COLLATE NOCASE
  `).bind(householdId).all();

  const summaryLookup = await ctx.env.DB.prepare(`
    SELECT
      (SELECT COUNT(*)
         FROM GameOwners
        WHERE householdId = ?1
          AND storageLocationId IS NULL) AS unstoredCount,
      (SELECT COUNT(*)
         FROM GameOwners
        WHERE householdId = ?1
          AND storageLocationId IS NOT NULL
          AND isOnShelf = 0) AS offShelfCount
  `).bind(householdId).all();

  const locations = buildStorageTree(
    getDBResult('dbStorageList', 'find_locations', locationsLookup)
  );
  const summary = getDBResult('dbStorageList', 'find_counts', summaryLookup)[0] ?? {};

  return {
    locations,
    unstoredCount: Number(summary.unstoredCount) || 0,
    offShelfCount: Number(summary.offShelfCount) || 0
  };
}


/******************************************************************************/


/* Return the games stored directly in a location, or in that location and all
 * of its descendants when includeChildren is true.
 *
 * The location itself is checked by the route before this is called. Games are
 * returned in the same short shape as the collection and wishlist grids, with
 * the addition of the shelf state and the full storage path used by the
 * location-contents view. */
export async function dbStorageContents(ctx, householdId, storageId, includeChildren) {
  const lookup = (includeChildren === true)
    ? await ctx.env.DB.prepare(`
        WITH RECURSIVE storage_tree(id, path) AS (
          SELECT id, name
            FROM StorageLocation
           WHERE id = ?2 AND householdId = ?1
          UNION ALL
          SELECT child.id, storage_tree.path || ' / ' || child.name
            FROM StorageLocation AS child
            JOIN storage_tree ON child.parentId = storage_tree.id
           WHERE child.householdId = ?1
        )
        SELECT A.id, A.bggId, A.slug, B.name, A.imagePath,
               C.storageLocationId, C.isOnShelf,
               S.path AS storagePath
          FROM GameOwners AS C
          JOIN Game AS A ON A.id = C.gameId
          JOIN GameName AS B ON B.id = C.gameName
          JOIN storage_tree AS S ON S.id = C.storageLocationId
         WHERE C.householdId = ?1
         ORDER BY B.name COLLATE NOCASE
      `).bind(householdId, storageId).all()
    : await ctx.env.DB.prepare(`
        SELECT A.id, A.bggId, A.slug, B.name, A.imagePath,
               C.storageLocationId, C.isOnShelf,
               S.name AS storagePath
          FROM GameOwners AS C
          JOIN Game AS A ON A.id = C.gameId
          JOIN GameName AS B ON B.id = C.gameName
          JOIN StorageLocation AS S ON S.id = C.storageLocationId
         WHERE C.householdId = ?1
           AND C.storageLocationId = ?2
         ORDER BY B.name COLLATE NOCASE
      `).bind(householdId, storageId).all();

  const result = getDBResult(
    'dbStorageContents',
    includeChildren === true ? 'find_tree_games' : 'find_direct_games',
    lookup
  );
  const games = result.map(entry => ({
    ...entry,
    isOnShelf: entry.isOnShelf === 1
  }));

  return imgMapAssetListURLs(ctx, games, 'imagePath', 'thumbnail');
}


/******************************************************************************/


/* Return a single storage location, scoped to its household. */
export async function dbStorageDetails(ctx, householdId, storageId) {
  const lookup = await ctx.env.DB.prepare(`
    SELECT id, householdId, parentId, name
      FROM StorageLocation
     WHERE id = ?1
       AND householdId = ?2
  `).bind(storageId, householdId).all();

  return getDBResult('dbStorageDetails', 'find_location', lookup)[0] ?? null;
}


/******************************************************************************/


/* Check whether a sibling with the given name already exists. Passing an
 * excludeId allows a rename to keep its own current name. */
export async function dbStorageSiblingExists(ctx, householdId, parentId, name, excludeId = null) {
  const lookup = await ctx.env.DB.prepare(`
    SELECT id
      FROM StorageLocation
     WHERE householdId = ?1
       AND COALESCE(parentId, 0) = COALESCE(?2, 0)
       AND name = ?3 COLLATE NOCASE
       AND (?4 IS NULL OR id <> ?4)
     LIMIT 1
  `).bind(householdId, parentId ?? null, name, excludeId).all();

  return getDBResult('dbStorageSiblingExists', 'find_sibling', lookup).length !== 0;
}


/******************************************************************************/


/* Create a location in a household's storage tree. The caller is responsible
 * for checking that the parent belongs to the same household. */
export async function dbStorageCreate(ctx, householdId, name, parentId) {
  const result = await ctx.env.DB.prepare(`
    INSERT INTO StorageLocation (householdId, parentId, name)
    VALUES (?1, ?2, ?3)
  `).bind(householdId, parentId ?? null, name).all();

  getDBResult('dbStorageCreate', 'insert_location', result);

  return await dbStorageDetails(ctx, householdId, result.meta.last_row_id);
}


/******************************************************************************/


/* Rename an existing location. */
export async function dbStorageUpdate(ctx, householdId, storageId, name) {
  const result = await ctx.env.DB.prepare(`
    UPDATE StorageLocation
       SET name = ?1
     WHERE id = ?2
       AND householdId = ?3
  `).bind(name, storageId, householdId).all();

  getDBResult('dbStorageUpdate', 'update_location', result);

  return await dbStorageDetails(ctx, householdId, storageId);
}


/******************************************************************************/


/* Return how many child locations and assigned games a location has. The
 * caller uses this to produce a useful conflict message before deletion. */
export async function dbStorageUsage(ctx, householdId, storageId) {
  const lookup = await ctx.env.DB.prepare(`
    SELECT
      (SELECT COUNT(*)
         FROM StorageLocation
        WHERE householdId = ?1
          AND parentId = ?2) AS childCount,
      (SELECT COUNT(*)
         FROM GameOwners
        WHERE householdId = ?1
          AND storageLocationId = ?2) AS gameCount
  `).bind(householdId, storageId).all();

  const usage = getDBResult('dbStorageUsage', 'find_usage', lookup)[0] ?? {};

  return {
    childCount: Number(usage.childCount) || 0,
    gameCount: Number(usage.gameCount) || 0
  };
}


/******************************************************************************/


/* Delete an empty location. The foreign keys and this usage check both guard
 * against deleting a location that still has children or games. */
export async function dbStorageDelete(ctx, householdId, storageId) {
  const result = await ctx.env.DB.prepare(`
    DELETE FROM StorageLocation
     WHERE id = ?1
       AND householdId = ?2
  `).bind(storageId, householdId).all();

  getDBResult('dbStorageDelete', 'delete_location', result);

  return result.meta.changes > 0;
}


/******************************************************************************/


/* Assign an owned game to a storage location, or unstore it when the location
 * is null. The caller enforces the semantic rule that an unstored game cannot
 * be on shelf; the database trigger enforces it as well. */
export async function dbStorageAssign(ctx, householdId, gameId, storageLocationId, isOnShelf) {
  const result = await ctx.env.DB.prepare(`
    UPDATE GameOwners
       SET storageLocationId = ?1,
           isOnShelf = ?2
     WHERE householdId = ?3
       AND gameId = ?4
  `).bind(storageLocationId ?? null, isOnShelf ? 1 : 0, householdId, gameId).all();

  getDBResult('dbStorageAssign', 'assign_storage', result);

  return result.meta.changes > 0;
}


/******************************************************************************/
