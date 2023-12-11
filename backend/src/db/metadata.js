/******************************************************************************/


import slug from "slug";

import { getDBResult } from './common.js';


/******************************************************************************/


/* This array lists all of the different types of game metadata that we
 * currently support.
 *
 * This is used:
 *   - in internal objects to name the fields that carry lists of metadata so
 *     that the type of metadata is known
 *   - in the metadata table itself to flag what kind of data each row is
 *   - in generic calls to metadata functions to flag what kind of metadata
 *     to operation on.*/
export const metadataTypeList = ["designer", "artist", "publisher"  , "category", "mechanic", ];


/* A simple helper for metadata validation; returns true or false to indicate
 * if the passed in metadata type is one of the valid, known types or not. */
const isValidMetadataType = metatype => metadataTypeList.indexOf(metatype) !== -1;


/******************************************************************************/


/* Given a list of metadata objects of the form:
 *    {
 *      "bggId": 1027,
 *      "name": "Trivia",
 *      "slug": "trivia"
 *    }
 *
 * In which only the name field is strictly required, return back a mapped
 * version that has all of the fields in it.
 *
 * A missing bggID will be populated with 0 (no such ID); a missing slug will be
 * populated from the name.
 *
 * This will work for any of the metadata that appears in the metadataTableMap,
 * which all use the same structure and differ only in the table into which
 * they store their data. */
const prepareMetadata = data => data.map(el => {
  if (el?.name === undefined) {
    throw Error("metadata element is missing the 'name' field");
  }

  // Ensure that there is a BGG; no ID means this isn't something that tracks
  // on BGG.
  if (el?.bggId === undefined) {
    el.bggId = 0;
  }

  // Ensure that there is a slug; if there's not, create one from the name.
  if (el?.slug === undefined) {
    el.slug = slug(el.name);
  }
  return el;
});


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
  // Make sure that the metadata type we got is correct.
  if (isValidMetadataType(metaType) === false) {
    throw Error(`unknown metadata type ${metaType}`);
  }

  // Fill out any fields in the metadata that are required but not currently
  // present.
  const metadata = prepareMetadata(inputMetadata);

  // Grab from the list of items all of the slugs so we can see which ones
  // already exist in the table.
  //
  // TODO: This should check to see if any slugs overlap and bitch about it,
  //       because we won't add them and someone will surely be confused.
  const slugs = metadata.map(el => el.slug);

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
  const insertMetadata = metadata.filter(el => existingSlugs.indexOf(el.slug) === -1);

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
  // Make sure that the metadata type we got is correct.
  if (isValidMetadataType(metaType) === false) {
    throw Error(`unknown metadata type ${metaType}`);
  }

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
      SELECT C.gameId, A.bggId, B.name, A.slug
        FROM Game as A, GameName as B, GameMetadataPlacement as C
      WHERE A.id == B.gameId and B.isPrimary = 1
        AND C.gameID = A.id
        AND C.itemId = ?
    `).bind(record.id).all();
    record.games = getDBResult('getMetadataDetails', 'find_games', gameData);
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
  // Make sure that the metadata type we got is correct.
  if (isValidMetadataType(metaType) === false) {
    throw Error(`unknown metadata type ${metaType}`);
  }

  // Try to find all metadata item of this type.
  const metadata = await ctx.env.DB.prepare(`
    SELECT id, bggId, slug, name from GameMetadata
     WHERE metatype = ?
  `).bind(metaType).all();

  return getDBResult('getMetadataList', 'find_meta', metadata);
}


/******************************************************************************/
