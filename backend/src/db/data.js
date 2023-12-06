/******************************************************************************/


import slug from "slug";

import { success, fail } from "./common.js";


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
  "bggID": 0,
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
const ensureData = (obj, keys) => {
  for (const key of keys) {
    if (Object.keys(obj).indexOf(key) === -1) {
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
    SELECT id, bggId, name, slug from ${table}
    WHERE slug in (SELECT value from json_each('${JSON.stringify(slugs)}'))
  `);
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
  const insertNew = ctx.env.DB.prepare(`INSERT INTO ${table} VALUES(NULL, ?1, ?2, ?3)`);
  const insertBatch = insertMetadata.map(el => insertNew.bind(el.bggId, el.slug, el.name));

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
 * This will insert a new game record into the database. */
export async function insertGame(ctx) {
  try {
    // Suck in the metadata and ensure that it has all of the fields that we
    // expect it to have.
    const gameData = await ctx.req.json();

    // The incoming data strictly requires the following fields to be present;
    // if they are not there, we will kick out an error.
    if (ensureData(gameData, ["name", "slug", "published", "description"]) == false ||
                   gameData.name.length == 0) {
      return fail(ctx, `required fields are missing from the input`);
    }

    // Combine together the defaults with the provided game record in order to
    // come up with the final list of things to insert.
    const details = { ...defaultGameFields, ...gameData }

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

    return success(ctx, `added game ${id}`, {
      id,
      bggId: details.bggId,
      slug: details.slug
    });
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
