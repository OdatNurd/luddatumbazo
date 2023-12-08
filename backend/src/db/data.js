/******************************************************************************/


import slug from "slug";

import { BGGLookupError } from './exceptions.js';
import { success, fail } from "./common.js";

import { lookupBGGGame } from "./bgg.js";


/******************************************************************************/


/* This is a mapping between the types of metadata that we understand and the
 * underlying table in which those metadata records live. */
const metadataTableMap = {
  "category": "Category",
  "mechanic": "Mechanic",
  "designer": "Designer",
  "artist": "Artist",
  "publisher": "Publisher",
};


/* When we get a request to add a new game, these fields represent the fields
 * that are optional; if they're not specified, their values are set with the
 * values that are seen here. */
const defaultGameFields = {
  "bggId": 0,
  "expandsGameId": 0,
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
export async function doRawMetadataUpdate(ctx, inputMetadata, metaType) {
  // Make sure that the metadata type we got is correct.
  const table = metadataTableMap[metaType];
  if (table === undefined) {
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
  const existing = (await lookupExisting.all()).results;

  // If the result that came back has the same length as the list of slugs,
  // then all of the items are already in the database, so there's no reason to
  // do anything and we can just return right now.
  if (slugs.length === existing.length) {
    return existing;
  }

  // Not all of the items exist; get the list of existing slugs so that we can
  // see what needs to be added.
  const existingSlugs = (await lookupExisting.all()).results.map(el => el.slug);

  // Gather from the input metadata all of the records whose slugs don't appear
  // in the list of existing slugs; those are the items that we need to insert
  // records for.
  const insertMetadata = metadata.filter(el => existingSlugs.indexOf(el.slug) === -1);

  // Construct an insert statement that we can use to insert a new record when
  // needed.
  const insertNew = ctx.env.DB.prepare(`INSERT INTO GameMetadata VALUES(NULL, ?1, ?2, ?3, ?4)`);
  const insertBatch = insertMetadata.map(el => insertNew.bind(metaType, el.bggId, el.slug, el.name));

  // If the batch is not empty, then we can execute to insert the new ones.
  if (insertBatch.length > 0) {
    await ctx.env.DB.batch(insertBatch);
  }

  // Now look up all of the existing records based on the slugs we were given;
  // this will now be all of them.
  const result = await lookupExisting.all();
  return result.results;
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
export async function doRawGameInsert(ctx, gameData) {
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
  details.category  = await doRawMetadataUpdate(ctx, details.category,  'category');
  details.mechanic  = await doRawMetadataUpdate(ctx, details.mechanic,  'mechanic');
  details.designer  = await doRawMetadataUpdate(ctx, details.designer,  'designer');
  details.artist    = await doRawMetadataUpdate(ctx, details.artist,    'artist');
  details.publisher = await doRawMetadataUpdate(ctx, details.publisher, 'publisher');

  // 0. For each of category, mechanic, designer, artist and publisher, update
  // 1. Insert the raw data for this game into the database
  // 2. Determine the new gameID and then insert the names for this game
  // 3. Update placements for all items in 0
  const stmt = ctx.env.DB.prepare(`INSERT INTO Game
            (bggId, expandsGameId, slug, description, publishedIn, minPlayers,
             maxPlayers, minPlayerAge, playtime, minPlaytime, maxPlaytime,
             complexity)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    details.bggId,
    details.expandsGameId,
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
  const id = result.meta.last_row_id;

  // For each of the available metadata items, we need to add items into the
  // appropriate placement table to record that this game utilizes those
  // items.
  //
  // Build that up as a batch
  const batch = [];
  for (const metatype of Object.keys(metadataTableMap)) {
    const update = ctx.env.DB.prepare(`
      INSERT INTO GameMetadataPlacement
      VALUES (NULL, ?1, ?2, ?3)
    `);

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
  await ctx.env.DB.batch(batch);

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
export async function doRawBGGGameInsert(ctx, bggGameId) {
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

  // If we found anything, this game can't be added because it already exists.
  if (existing.results.length !== 0) {
    throw new BGGLookupError(`cannot add bggId ${bggGameId}: this game or its slug already exist`, 409);
  }

  // Try to insert the game record now, and tell the caller
  return await doRawGameInsert(ctx, gameInfo);
}


/******************************************************************************/


/* Input:
 *   A JSON object of the form:
 *     {
 *       "bggId": 9216,
 *       "expandsGameId": 0,
 *       "name": [],
 *       "slug",
 *       "published": 2004,
 *       "minPlayers": 2,
 *       "maxPlayers": 4,
 *       "minPlayerAge": 12,
 *       "playTime": 90,
 *       "minPlayTime": 90,
 *       "maxPlayTime": 90,
 *       "description": "",
 *       "thumbnail": "",
 *       "image": "",
 *       "complexity": 3.3717,
 *       "category": [],
 *       "mechanic": [],
 *       "designer": [],
 *       "artist": [],
 *       "publisher": []
 *     }
 *
 * This will insert a new game record into the database based on the passed in
 * data, including adding name records, adding in any of the metadata fields
 * that are not already present, and updating the placement of those items so
 * that the full game record is available. */
export async function insertGame(ctx) {
  try {
    // Suck in the new game data and use it to do the insert; the helper
    // function does all of the validation, and will throw on error or return
    // details of the new game on success.
    const gameData = await ctx.req.json();
    const newGameInfo = await doRawGameInsert(ctx, gameData);

    // Return success back.
    return success(ctx, `added game ${newGameInfo.id}`, newGameInfo);
  }
  catch (err) {
    if (err instanceof SyntaxError) {
      return fail(ctx, `invalid JSON; ${err.message}`, 400);
    }

    return fail(ctx, err.message, 500);
  }
}


/******************************************************************************/


/* Input: a bggGameId in the URL that represents the ID of a game from
 * BoardGameGeek that we want to insert.
 *
 * This will look up the data for the game and use it to perform the insertion
 * directly.
 *
 * The result of this query is the same as adding a game by providing an
 * explicit body. */
export async function insertBGGGame(ctx) {
  const { bggGameId } = ctx.req.param();

  try {
    const newGameInfo = await doRawBGGGameInsert(ctx, bggGameId);
    if (newGameInfo === null) {
      return fail(ctx, `BGG has no record of game with ID ${bggGameId}`, 404);
    }

    // Return success back.
    return success(ctx, `added game ${newGameInfo.id}`, newGameInfo);
  }
  catch (err) {
    // Handle BGG Lookup Errors specially.
    if (err instanceof BGGLookupError) {
      return fail(ctx, err.message, err.status);
    }

    return fail(ctx, err.message, 500);
  }
}


/******************************************************************************/


/* Input: a bggGameId in the URL that represents the ID of a game from
 * BoardGameGeek that we want to insert.
 *
 * This will look up the data for the game and use it to perform the insertion
 * directly.
 *
 * The result of this query is the same as adding a game by providing an
 * explicit body. */
export async function insertBGGGameList(ctx) {
  try {
    // Suck in the new game data and use it to do the insert; the helper
    // function does all of the validation, and will throw on error or return
    // details of the new game on success.
    const gameList = await ctx.req.json();

    // Track which of the games we loop over was added and which was inserted.
    const inserted = [];
    const skipped = []
    const result = { inserted, skipped };

    // Loop over all of the BGG id's in the game list and try to insert them.
    for (const bggGameId of gameList) {
      try {
        // Try to lookup and insert this game; the result is either null if
        // there was a failure, or information on the inserted game.
        const newGameInfo = await doRawBGGGameInsert(ctx, bggGameId);
        if (newGameInfo === null) {
          skipped.push({ "bggId": bggGameId, status: 404, reason: "not found" });
        } else {
          inserted.push(newGameInfo);
        }
      }

      // If the insert threw any errors, handle them. If they are BGG lookup
      // failures, we can eat them and just skip this. Otherwise, we need to
      // re-throw so the outer handler can handle the problem for us.
      catch (err) {
        if (err instanceof BGGLookupError) {
          skipped.push({ "bggId": bggGameId, status: err.status, reason: "ID or slug already exists" });
          continue;
        }

        throw err;
      }
    }

    // Return success back.
    return success(ctx, `inserted ${inserted.length} games of ${gameList.length}`, result);
  }
  catch (err) {
    if (err instanceof SyntaxError) {
      return fail(ctx, `invalid JSON; ${err.message}`, 400);
    }

    return fail(ctx, err.message, 500);
  }
}


/******************************************************************************/


/* Input:
 *   An array of JSON objects of the form:
 *    {
 *      "bggId": 1027,
 *      "name": "Trivia",
 *      "slug": "trivia"
 *    }
 *
 * Parameter:
 *    One of the metatypes from the metaTableMap table, to indicate which of
 *    the tables we are dealing with.
 *
 * This call will ensure that all of the input objects have all three fields
 * by inserting a 0 bggId if one is not present, and by generating a slug from
 * the name if a slug is not present.
 *
 * Once that is done, a bulk insert will occur that adds all items to the table
 * that don't already exist there.
 *
 * For the purposes of existing:
 *   - the bggId is used to see if an entry has previously been inserted
 *
 * That is to say, it is possible to insert the same item with the same name
 * multiple times, but when trying to import a BGG based item the call will
 * skip over all items that are BGG related which have previously been imported.
 *
 * The result is currently the native D1 result of the query. */
export async function gameMetadataUpdate(ctx, metaType) {
  try {
    // Prepare the Metadata update and execute it
    const result = await doRawMetadataUpdate(ctx, await ctx.req.json(), metaType);

    return success(ctx, `updated some ${metaType} records` , result);
  }
  catch (err) {
    if (err instanceof SyntaxError) {
      return fail(ctx, `invalid JSON; ${err.message}`, 400);
    }

    return fail(ctx, err.message, 500);
  }
}


/******************************************************************************/
