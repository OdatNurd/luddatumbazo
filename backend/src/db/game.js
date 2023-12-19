/******************************************************************************/


import { BGGLookupError } from './exceptions.js';

import { cfImagesURLUpload, mapImageAssets, getImageAssetURL, getDBResult } from './common.js';
import { metadataTypeList, updateMetadata } from './metadata.js';
import { lookupBGGGame } from "./bgg.js";


/******************************************************************************/


/* When we get a request to add a new game, these fields represent the fields
 * that are optional; if they're not specified, their values are set with the
 * values that are seen here. */
const defaultGameFields = {
  "bggId": 0,
  "minPlayers": 1,
  "maxPlayers": 1,
  "minPlayerAge": 1,
  "playTime": 1,
  "minPlayTime": 1,
  "maxPlayTime": 1,
  "complexity": 1.0,
  "category": [],
  "mechanic": [],
  "designer": [],
  "artist": [],
  "publisher": []
}


/******************************************************************************/


/* Given an object and an array of keys, ensure that each of the keys in the
 * list appear in the object.
 *
 * The return value is false if any keys are missing and true if all are
 * present. */
const ensureRequiredKeys = (obj, keys) => {
  for (const key of keys) {
    if (obj[key] === undefined) {
      return false
    }
  }
  return true;
}


/******************************************************************************/


/* Get a list of all of the games known to the database, including their slug
 * and the primary name associated with each of them. */
export async function getGameList(ctx) {
  // Try to find all metadata item of this type.
  const gameList = await ctx.env.DB.prepare(`
    SELECT A.id, A.bggId, A.slug, B.name, A.imagePath
      FROM Game as A, GameName as B
     WHERE A.id == B.gameId and B.isPrimary = 1
  `).all();

  const result = getDBResult('getGameList', 'find_games', gameList);
  return mapImageAssets(ctx, result, 'imagePath', 'thumbnail');
}


/******************************************************************************/


/* Get the full details on the game with either the ID or slug provided. The
 * return will be null if there is no such game, otherwise the return is an
 * object that contains the full details on the game, including all of its
 * metadata. */
export async function getGameDetails(ctx, idOrSlug) {
  // Try to find the game with the value has that been provided; we check to see
  // if the provided ID is either a slug or an actual ID.
  const lookup = await ctx.env.DB.prepare(`
    SELECT * FROM Game
     WHERE (id == ?1 or slug == ?1)
  `).bind(idOrSlug).all();
  const result = getDBResult('getGameDetails', 'find_game', lookup);

  // If there was no result found, then return null back to signal that.
  if (result.length === 0) {
    return null;
  }

  // Set up the game data and map the game image URL.
  const gameData = result[0];
  gameData.imagePath = getImageAssetURL(ctx, gameData.imagePath, 'boxart');

  // Gather the list of all of the names that this game is known by; much like
  // when we do the insert, the primary name is brought to the top of the list.
  const names = await ctx.env.DB.prepare(`
    SELECT name from GameName
     WHERE gameId = ?
     ORDER BY isPrimary DESC;
  `).bind(gameData.id).all();
  gameData.names = getDBResult('getGameDetails', 'find_names', names).map(el => el.name);

  // Gather the list of all of the metadata that's associated with this game.
  const metadata = await ctx.env.DB.prepare(`
    SELECT A.metatype, B.id, B.bggId, B.slug, B.name
      FROM GameMetadataPlacement as A,
           GameMetadata as B
     WHERE A.gameId = ?
       AND A.itemId = B.id
     ORDER BY A.metatype;
  `).bind(gameData.id).all();

  // Map the records into the returned gameData; the metatype field is used to
  // set the field in the main object where this data will go, but we don't
  // want the metatype field to appear in the resulting object.
  metadataTypeList.forEach(type => gameData[type] = []);
  getDBResult('getGameDetails', 'find_meta', metadata).forEach(item => gameData[item.metatype].push({ ...item, metatype: undefined }) );

  return gameData;
}


/******************************************************************************/


/* This takes as input a raw object that represents the data to be used to
 * insert a game into the database, and performs the insertion if possible.
 *
 * The incoming data will be validated to ensure that it has the required
 * minimum fields.
 *
 * The return value is details on the game that was inserted. If any error
 * occurs during the insertion, such as database errors or data validation
 * errors, an exception is thrown.
 *
 * In the event that the game is not inserted, it is possible that a metadata
 * update of core data in this record might still be applied to the database
 * because D1 doesn't have the concept of transactions in code paths that
 * require code between DB accesses. */
export async function insertGame(ctx, gameData) {
  // The incoming data strictly requires the following fields to be present;
  // if they are not there, we will kick out an error.
  if (ensureRequiredKeys(gameData, ["name", "slug", "published", "description"]) == false ||
                         gameData.name.length == 0) {
    throw Error(`required fields are missing from the input data`);
  }

  // Combine together the defaults with the provided game record in order to
  // come up with the final list of things to insert.
  const details = { ...defaultGameFields };
  for (const [key, value] of Object.entries(gameData)) {
    if (value !== undefined) {
      details[key] = value;
    }
  }

  // Ensure that all of the metadata that we need is available. This does not
  // run in a transaction, so if we bail later, these items will still be in
  // the database; we can look into making that smarter later.
  details.category  = await updateMetadata(ctx, details.category,  'category');
  details.mechanic  = await updateMetadata(ctx, details.mechanic,  'mechanic');
  details.designer  = await updateMetadata(ctx, details.designer,  'designer');
  details.artist    = await updateMetadata(ctx, details.artist,    'artist');
  details.publisher = await updateMetadata(ctx, details.publisher, 'publisher');

  // 0. For each of category, mechanic, designer, artist and publisher, update
  // 1. Insert the raw data for this game into the database
  // 2. Determine the new gameID and then insert the names for this game
  // 3. Update placements for all items in 0
  const stmt = ctx.env.DB.prepare(`INSERT INTO Game
            (bggId, slug, description, publishedIn, minPlayers, maxPlayers,
             minPlayerAge, playtime, minPlaytime, maxPlaytime, complexity)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    details.bggId,
    details.slug,
    details.description,
    details.published,
    details.minPlayers,
    details.maxPlayers,
    details.minPlayerAge,
    details.playTime,
    details.minPlayTime,
    details.maxPlayTime,
    details.complexity
  );

  // Grab the result that falls out of the DB; this must be a success because
  // if it fails, it will jump to the catch.
  //
  // The last row ID in the metadata is the SQLite return for the last
  // inserted rowID, which is the ID of the item we just inserted.
  const result = await stmt.run();
  getDBResult('insertGame', 'insert_game', result);
  const id = result.meta.last_row_id;

  // If we were given the URL to an image for this game, then try to upload it
  // to images so we can add it to our game record.
  try {
    if (gameData.image !== undefined && gameData.image !== '') {
      // Set up a base metadata object that tells the uploader about the image,
      // and then attempt to gather it.
      const imageMeta = { gameId: id, bggId: gameData.bggId, bggURL: gameData.image };
      const data = await cfImagesURLUpload(ctx, imageMeta);

      // Update the game record we just inserted so that it knows about the new
      // image path.
      const imgResponse = await ctx.env.DB.prepare(`
        UPDATE Game SET imagePath = ?2
         WHERE id = ?1
      `).bind(id, `cfi:///${data.id}`).run();
      getDBResult('insertGame', 'set_img_url', imgResponse);
    }
  }
  catch (error) {
    console.log(`error while uploading game image: ${error}`);
  }

  // For each of the available metadata items, we need to add items into the
  // appropriate placement table to record that this game utilizes those
  // items.
  //
  // Build that up as a batch
  const batch = [];
  const update = ctx.env.DB.prepare(`
    INSERT INTO GameMetadataPlacement
    VALUES (NULL, ?1, ?2, ?3)
  `);
  for (const metatype of metadataTypeList) {
    for (const item of details[metatype]) {
      batch.push(update.bind(id, metatype, item.id) )
    }
  }

  // Add to the batch a list of items that will insert the names for this
  // game into the list.
  const addName = ctx.env.DB.prepare(`
    INSERT INTO GameName
    VALUES (NULL, ?1, ?2, ?3)
  `);
  for (const idx in details.name) {
    // This is dumb because I'm dumb, D1 is Dumb, and JavaScript is dumb.
    // WHY SO DUMB?!
    batch.push(addName.bind(id, details.name[idx], idx === '0' ? 1 : 0))
  }

  // Trigger the batch; we don't need to see the results of this since it is
  // all insert operations on bound metadata.
  const insert = await ctx.env.DB.batch(batch);
  getDBResult('insertGame', 'insert_details', insert);

  // The operation succeeded; return back information on the record that was
  // added.
  return {
    id,
    bggId: details.bggId,
    name: details.name[0],
    slug: details.slug
  }
}


/******************************************************************************/


/* Perform a raw insert of a game that is associated with a BoardGameGeek ID.
 *
 * This will perform the lookup to try and find the information on the game,
 * and if found, will insert it, returning back some details on the game that
 * was added.
 *
 * On success (the game is found and inserted), an object detailing the new
 * game is returned.
 *
 * If the game can't be found, null is returned instead.
 *
 * An exception will be raised if there is any problem gathering the game data
 * from the BGG Endpoint, or if the game can't be inserted because it already
 * exists. */
export async function insertBGGGame(ctx, bggGameId) {
  // Look up the game in BoardGameGeek to get it's details; if the game is not
  // found, we can return NULL back.
  const gameInfo = await lookupBGGGame(bggGameId);
  if (gameInfo === null) {
    return null;
  }

  // Try to find a game that has either this slug or this bggId; if we find
  // one, then this game already exists and we can't do this insert because
  // it would collide.
  const existing = await ctx.env.DB.prepare(`
    SELECT id FROM Game
    WHERE bggId = ? or slug = ?;
  `).bind(gameInfo.bggId, gameInfo.slug).all();
  const result = getDBResult('insertBGGGame', 'find_existing', existing);

  // If we found anything, this game can't be added because it already exists.
  if (result.length !== 0) {
    throw new BGGLookupError(`cannot add bggId ${bggGameId}: this game or its slug already exist`, 409);
  }

  // Try to insert the game record now, and tell the caller
  return await insertGame(ctx, gameInfo);
}


/******************************************************************************/
