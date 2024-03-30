/******************************************************************************/


import slug from 'slug';

import { getDBResult } from '#db/common';

import { mapImageAssets } from '#lib/image';


/******************************************************************************/


/* This array lists all of the different types of game metadata that we
 * currently support.
 *
 * This is used:
 *   - in internal objects to name the fields that carry lists of metadata so
 *     that the type of metadata is known
 *   - in the metadata table itself to flag what kind of data each row is
 *   - in generic calls to metadata functions to flag what kind of metadata
 *     to operation on. */
export const metadataTypeList = ["designer", "artist", "publisher"  , "category", "mechanic", ];


/******************************************************************************/


/* This takes an array of metadata records (which may be partial) and a specific
 * metadata type that appears in the metadataTableMap.
 *
 * The call will expand out the passed in data to ensure that it includes the
 * required keys if any are missing, and then run a batch statement to try to
 * insert any which are not already present.
 *
 * Items that have a bggId associated with them will be disambiguated and the
 * call will make sure not to try to add such items to the database if they
 * already exist. This facilitates easy injection of BoardGameGeek Data.
 *
 * Entries that don't have a bggId will be disambiguated by their slugs.
 *
 * The returned value is a list of dictionaries much like the input, but with
 * the internal ID's of the items associated returned back. These could be new
 * ID's, or they could be the result of that data always having been there. */
export async function updateMetadata(ctx, inputMetadata, metaType) {
  // Grab from the list of items all of the slugs so we can see which ones
  // already exist in the table.
  //
  // TODO: This should check to see if any slugs overlap and bitch about it,
  //       because we won't add them and someone will surely be confused.
  const slugs = inputMetadata.map(el => el.slug);

  // Query the database to see which of the included slugs already have entries
  // in the table; we don't want to try to insert those.
  const lookupExisting = ctx.env.DB.prepare(`
    SELECT id, bggId, name, slug from GameMetadata
    WHERE metatype = ? AND slug in (SELECT value from json_each('${JSON.stringify(slugs)}'))
  `).bind(metaType);
  const existing = getDBResult('updateMetadata', 'find_existing', await lookupExisting.all());

  // If the result that came back has the same length as the list of slugs,
  // then all of the items are already in the database, so there's no reason to
  // do anything and we can just return right now.
  if (slugs.length === existing.length) {
    return existing;
  }

  // Not all of the items exist; get the list of existing slugs so that we can
  // see what needs to be added.
  const existingSlugs = existing.map(el => el.slug);

  // Gather from the input metadata all of the records whose slugs don't appear
  // in the list of existing slugs; those are the items that we need to insert
  // records for.
  const insertMetadata = inputMetadata.filter(el => existingSlugs.indexOf(el.slug) === -1);

  // Construct an insert statement that we can use to insert a new record when
  // needed.
  const insertNew = ctx.env.DB.prepare(`INSERT INTO GameMetadata VALUES(NULL, ?1, ?2, ?3, ?4)`);
  const insertBatch = insertMetadata.map(el => insertNew.bind(metaType, el.bggId, el.slug, el.name));

  // If the batch is not empty, then we can execute to insert the new ones.
  // The batch returns an array of results, one per item in the input, but none
  // of them have any details since they are insert statements.
  if (insertBatch.length > 0) {
    const batched = await ctx.env.DB.batch(insertBatch);
    getDBResult('updateMetadata', 'insert_meta', batched);
  }

  // Now look up all of the existing records based on the slugs we were given;
  // this will now be all of them.
  // TODO:
  //   To be more resource friendly, this could look up only those items whose
  //   slugs are in the insertMetadata list, and then combine them with the
  //   initial results, rather than re-scanning for items we already found.
  return getDBResult('updateMetadata', 'final_lookup', await lookupExisting.all())
}


/******************************************************************************/


/* Query for information on a given metadata type according to either it's
 * slug or it's unique identifier.
 *
 * The result will be null if there is no such metadata record found, or the
 * details of that metadata item on success.
 *
 * If includeGames is true, a second query is done to try and find all of the
 * games that are currently tied to this piece of metadata. That list will be
 * empty if there are no such records.
 *
 * This may raise exceptions if there are issues talking to the database, or if
 * the metaType is not valid. */
export async function getMetadataDetails(ctx, metaType, idOrSlug, includeGames) {
  // Try to find a metadata item of this type.
  const metadata = await ctx.env.DB.prepare(`
    SELECT id, bggId, slug, name, metatype FROM GameMetadata
    WHERE metatype == ?1
      AND (slug == ?2 or id == ?2)
  `).bind(metaType, idOrSlug).all();
  const result = getDBResult('getMetadataDetails', 'find_existing', metadata);

  // If we didn't find anything, we can signal an error back.
  if (result.length === 0) {
    return null;
  }

  // The return value is ostensibly information about this particular
  // metadata.
  const record = result[0];

  // If we were asked to, also try to find information on all of the games
  // that reference this metadata.
  if (includeGames === true) {
    // Try to find all such records, if any.
    const gameData = await ctx.env.DB.prepare(`
      SELECT C.gameId, A.bggId, B.name, A.slug, A.imagePath
        FROM Game as A, GameName as B, GameMetadataPlacement as C
      WHERE A.id == B.gameId and B.isPrimary = 1
        AND C.gameId = A.id
        AND C.itemId = ?
    `).bind(record.id).all();

    // Get the result, and then map the image path for all items into a full
    // item.
    record.games = getDBResult('getMetadataDetails', 'find_games', gameData);
    record.games = mapImageAssets(ctx, record.games, 'imagePath', 'thumbnail')
  }

  return record;
}


/******************************************************************************/


/* Query for the complete list of items of the given metadata type.
 *
 * This always results in a list of items, though that list may be empty.
 *
 * This may raise exceptions if there are issues talking to the database, or if
 * the metaType is not valid. */
export async function getMetadataList(ctx, metaType) {
  // Try to find all metadata item of this type.
  const metadata = await ctx.env.DB.prepare(`
    SELECT id, bggId, slug, name from GameMetadata
     WHERE metatype = ?
  `).bind(metaType).all();

  return getDBResult('getMetadataList', 'find_meta', metadata);
}


/******************************************************************************/


/* Delete from the Metadata list all of the metadata entries of the provided
 * metaType that are not being referenced by any game currently in the system.
 *
 * This may raise exceptions if there are issues talking to the database, or if
 * the metaType is not valid. */
export async function purgeUnusedMetadata(ctx, metaType, doPurge) {
  // Find all of the unused metadata entries of the given type
  const findSQL = `
    SELECT id, metatype, name, slug FROM GameMetadata
     WHERE metatype = ?1
       AND id NOT IN (SELECT DISTINCT itemId FROM GameMetadataPlacement WHERE metatype = ?1)
  `;

  // Find and remove all of the unused metadata entries of the given type.
  const purgeSQL = `
    DELETE FROM GameMetadata
     WHERE metatype = ?1
       AND id NOT IN (SELECT DISTINCT itemId FROM GameMetadataPlacement WHERE metatype = ?1)
  `;

  // Select the appropriate statement depending on what we were asked to do.
  const stmt = (doPurge === true) ? purgeSQL : findSQL;
  const action = (doPurge === true) ? 'purge_meta' : 'find_meta';

  // Try to find all metadata item of this type.
  const metadata = await ctx.env.DB.prepare(stmt).bind(metaType).all();

  return getDBResult('purgeUnusedMetadata', action, metadata);
}


/******************************************************************************/

