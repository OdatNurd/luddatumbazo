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


/* Takes as input a list of fields of the form:
 *   {
 *      "isExpansion": false,
 *      "name": "Reef Encounter",
 *      "bggId": 12962,
 *      "gameId": null
 *   }
 *
 * and validates that they are correct. In particular, isExpansion and name must
 * be present, but if bggId or gameId are missing, they will be populated with
 * a default value.
 *
 * We enforce that if the gameId is null, the bggId must not be 0; otherwise
 * this entry is ambiguous.
 *
 * Missing fields cause an error to be thrown. */
const validateExpansionDetails = data => data.filter(record => {
  if (ensureRequiredKeys(record, ["isExpansion", "name"]) == false) {
    throw new Error(`required fields are missing from the input expansion data`);
  }

  // Insert any ID's that are missing with their default values.
  record.gameId ??= null;
  record.bggId ??= 0;

  // If the gameId is null and we don't have a bggId, then this entry is useless
  // because it's ambiguous; raise an error.
  if (record.gameId === null && record.bggId === 0) {
    throw new Error(`one of gameId and bggId must be provided in the input expansion data`);
  }

  return record;
});


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
    throw new Error(`required fields are missing from the input data`);
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


/* Tries to find the crap, by doing a thing.
 *
 * The result is either the entry that is the crap, or null if we could not
 * find the crap.
 *
 * The paramters are:
 *    - existing
 *       The list of existing database records to search
 *    - ourGameId
 *       The gameID that represents US
 *    - ourBggGameId
 *       The BoardGameGeek ID that represents US
 *    - otherGame
 *       The entry with the data on the other side of the relation
 *
 * The return value is the first entry in the existing table that matches, or
 * undefined if we could not find a match.
 */
const findTheCrap = (existing, ourGameId, ourBggGameId, otherGame) => {
  // If the other game is an expansion, then we're the base game, so try to find
  // an entry where we are the base and the right hand side matches the other
  // game.
  let found = undefined;

  if (otherGame.isExpansion) {
    console.log(`the other game is an expansion, assuming we are the base`);
    // We are a base game; find the first entry where we are the base and the
    // other game is the expansion. Our details are always complete, but the
    // other side might have a null gameId.
    found = existing.find(game => {
      // If we are not the base game, then this can't match.
      if (game.baseGameId !== ourGameId || game.baseGameBggId !== ourBggGameId) {
        return false;
      }

      // This only matches if the bggId of the game matches the one in this
      // row; the internal gameId will never match because it's always null.
      return otherGame.bggId === game.expansionGameBggId;
    });
  } else {
    console.log(`the other game is the base, assuming we are the expansion`);

    // The other game is a base game, so we are the expansion. Do the same thing
    // as we just did, except backwards because we're the other side of the
    // relation.
    found = existing.find(game => {
      // If we are not the expansion game, then this can't match.
      if (game.expansionGameId !== ourGameId || game.expansionGameBggId !== ourBggGameId) {
        return false;
      }

      // This only matches if the bggId of the game matches the one in this
      // row; the internal gameId will never match because it's always null.
      return otherGame.bggId === game.baseGameBggId;
    });
  }

  console.log(`search found: ${JSON.stringify(found)}`);
  return found;
}


/******************************************************************************/


/* This accepts as input a combination of gameId and bggGameId that represents
 * some game *that exists in the database* whose expansion data we want to
 * adjust, and an array of items of the shape:
 *
 *     {
 *       "isExpansion": false,
 *       "name": "Reef Encounter",
 *       "bggId": 12962,
 *       "gameId": null
 *     }
 *
 * In the list, if gameId is not present, it is assumed to be null. Similarly
 * if bggId is not specified, it is assumed to be 0. There is a constraint on
 * the items in the list that says that EITHER gameId is not null OR bggId is
 * not 0; that is, the entry needs to either tell us about a game that currently
 * exists in the database, or have enough information to find it later when it
 * actually gets inserted.
 *
 * In each record, isExpansion describes the relationship between the entry and
 * the game that the function was called for (i.e. is the entry an expansion of
 * the game, or is the game an expansion of this entry).
 *
 * Similarly, the gameId/bggId specify the details of the game in the entry,
 * and name specifies what that entry is called, in case it's not actually in
 * the database.
 *
 * This format is based on data that comes from BoardGameGeek, where each game
 * lists all of it's expansions and each expansion lists all of its relevant
 * base games. We use the same data here to maintain better compatibility, with
 * the added benefit of being able to just add entries specifically by gameId if
 * they do not exist on bgg.
 *
 * This will make appropriate adjustments to the GameExpansion table, to either:
 *   - Add an entry saying that there is a known relation to this game
 *   - Update an incomplete relation once the other side is added to the db.
 *
 * In the table, the supposition is one side of the relation is always populated
 * while the other may or may not be. */
export async function updateExpansionDetails(ctx, myGameId, myBggId, expansionList) {
  // If we did not get a bggID, then set it to be 0, since that's the default
  // for that value.
  myBggId ??= 0;

  // Fully fill out all of the records in the expansions list. All records are
  // required to include the appropriate fields, though some will have defaults
  // if they're not set.
  const expansions = validateExpansionDetails(expansionList);

  console.log('*****************************************');
  console.log('*****************************************');
  console.log('*****************************************');

  // Find all of the entries in the GameExpansion table where our data is one
  // complete side of the link and the other side of the relation has a null
  // gameId indicating that there is a partial link ready to be established.
  //
  // This could return an empty list if there are no entries or if all of them
  // are already linked. Otherwise it will contain links for this game (for
  // either side of the link) for which we need to close the loop.
  const lookup = await ctx.env.DB.prepare(`
    SELECT * FROM GameExpansion
     WHERE (baseGameId = ?1 AND baseGameBggId = ?2 AND expansionGameId is null)
        OR (expansionGameId = ?1 AND expansionGameBggID = ?2 AND baseGameId is null)
  `).bind(myGameId, myBggId).all();
  const existing = getDBResult('updateExpansionDetails', 'find_links', lookup);

  // For each of the entries in the list, we need to see if there's an entry in
  // the existing list of links for the data that we have.
  //
  //   - If there is an existing item, it must be an incomplete link (since the
  //     query will not return it otherwise), so fill out the link and we are
  //     good.
  //   - If nothing is found, then this is the first time this link is being
  //     seen; in that case we need to insert a stub value.
  //
  // In both cases, the state of isExpansion tells us which side of the
  // link our details represent.
  console.log(`we are gameId ${myGameId} (bggId = ${myBggId})`);
  for (const game of expansions) {
    console.log(`considering: ${JSON.stringify(game)}`);

    // if isExpansion is false, then WE are an expansion and the game is the
    // base game. In that case try to find an entry in the existing items where
    // our data is on the right as an expansion and the data in the game we
    // have is on the left.
    //
    // - Entry not found:
    //    This is the first time this relation has been updated; insert a new
    //    record into the database, trying to use the data from the input record
    //    to fill out the other side if possible; this may leave the gameID as
    //    null, which would mean that this is an expansion for a base game that
    //    is not currently in the database. In that case leave the bggId alone
    //    so we can fix it later.
    // - Entry is found:
    //    This is not the first time this relation has been seen; previouslu
    //    an entry occured, but the game it refers to must not have been in the
    //    database, since only incomplete links fall out of the DB. In that case
    //    we should now how the correct data to insert.



    // Try to find the entry that maps to this record in the existing item list.
    // If this is null, we've never seen this before, so we should insert a
    // new entry
    const entry = findTheCrap(existing, myGameId, myBggId, game);
    if (entry === undefined) {
      console.log(`** nothing found; we need to insert a new record`);

      // This insert is wrong because when we insert the internal gameId for
      // either side (depending on what this game is), it is inserting the null
      // value that comes in the game object. It should ACTUALLY be using either
      // that OR looking up the ID based on the bggId.
      const insert = await ctx.env.DB.prepare(`
        INSERT INTO GameExpansion (baseGameId, baseGameBggId,
                                   expansionGameId, expansionGameBggId,
                                   entryName)
                    VALUES (?1, ?2, ?3, ?4, ?5)
      `).bind(
        game.isExpansion ? myGameId : game.gameId,
        game.isExpansion ? myBggId : game.bggId,
        game.isExpansion ? game.gameId : myGameId,
        game.isExpansion ? game.bggId : myBggId,
        game.name
      ).all();
      const result = getDBResult('updateExpansionDetails', 'add_new_link', insert);
      return result;
    } else {
      console.log(`** found an entry; the entry needs to be updated`);
    }
  }
}


/******************************************************************************/
