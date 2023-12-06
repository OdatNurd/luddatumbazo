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
 * populated from the name. */
const prepareMetadata = data => data.map(el => {
  if (el?.bggId === undefined) {
    el.bggId = 0;
  }
  if (el?.slug === undefined) {
    el.slug = slug(el.name);
  }
  return el;
});


/******************************************************************************/


/* Input:
 *   A JSON object of the form:
 *     {
 *       "bggID": 9216,
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

    // 0. For each of category, mechanic, designer, artist and publisher, update
    // 1. Insert the raw data for this game into the database
    // 2. Determine the new gameID and then insert the names for this game
    // 3. Update placements for all items in 0
    const stmt = ctx.env.DB.prepare(`INSERT INTO Game
              (bggID, expandsGameId, slug, description, publishedIn, minPlayers,
               maxPlayers, minPlayerAge, playtime, minPlaytime, maxPlaytime,
               complexity)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      gameData?.bggId,
      gameData?.expandsGameId || 0,
      slug(gameData?.name[0]),
      gameData?.description,
      gameData?.published,
      gameData?.minPlayers,
      gameData?.maxPlayers,
      gameData?.minPlayerAge,
      gameData?.playTime,
      gameData?.minPlayTime,
      gameData?.maxPlayTime,
      gameData?.complexity
    );

    console.log(stmt);
    return ctx.json(await stmt.run());
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
    const table = metadataTableMap[metaType];
    if (table === undefined) {
      return fail(ctx, `unknown metadata type ${metaType}`, 500);
    }

    // Suck in the metadata and ensure that it has all of the fields that we
    // expect it to have.
    const metadata = prepareMetadata(await ctx.req.json());

    // Grab from the list of items the list of BGG ID's that are not 0; those
    // will be the ones that we might need to skip inserting.
    const inputBGGIds = metadata.filter(el => el.bggId !== 0).map(el => el.bggId);

    // Query the database to see the list of IDs that already exist; for those
    // IDS we do not need to do anything.
    const query = ctx.env.DB.prepare(`SELECT bggId FROM ${table}
                                     WHERE bggId IN (SELECT value FROM json_each('${JSON.stringify(inputBGGIds)}'))`);
    const existingIds = (await query.raw()).map(el => el[0]);

    // Construct an insert statement that we can use to insert a new record.
    const insert = ctx.env.DB.prepare(`INSERT INTO ${table} VALUES(NULL, ?1, ?2, ?3)`);
    const batch = metadata.filter(el => existingIds.indexOf(el.bggId) === -1)
                          .map(el => insert.bind(el.bggId, el.slug, el.name));

    // Send the results out to the database
    const result = await ctx.env.DB.batch(batch);

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
