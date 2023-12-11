/******************************************************************************/


import slug from "slug";

import { BGGLookupError } from '../db/exceptions.js';
import { success, fail } from "./common.js";

import { insertGame, insertBGGGame, getGameList, getGameDetails } from '../db/game.js';
import { updateMetadata, getMetadataDetails, getMetadataList } from '../db/metadata.js';


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
export async function insertGameReq(ctx) {
  try {
    // Suck in the new game data and use it to do the insert; the helper
    // function does all of the validation, and will throw on error or return
    // details of the new game on success.
    const gameData = await ctx.req.json();
    const newGameInfo = await insertGame(ctx, gameData);

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
export async function insertBGGGameReq(ctx) {
  const { bggGameId } = ctx.req.param();

  try {
    const newGameInfo = await insertBGGGame(ctx, bggGameId);
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
export async function insertBGGGameListReq(ctx) {
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
        const newGameInfo = await insertBGGGame(ctx, bggGameId);
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
export async function gameMetadataUpdateReq(ctx, metaType) {
  try {
    // Prepare the Metadata update and execute it
    const result = await updateMetadata(ctx, await ctx.req.json(), metaType);

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


/* Take as input a value that is one of:
 *   - an internal ID of the given type of metadata
 *   - a slug that represents an item
 *
 * The return value is information on that item (if any). Optionally, the query
 * can include a "games" directive to also return information on the games that
 * reference this data. */
export async function gameMetadataQueryReq(ctx, metaType) {
  // Can be either an item ID or a slug for the given metadata item
  const { idOrSlug } = ctx.req.param();

  // If this field exists in the query (regardless of the value), then we will
  // also gather game information.
  const includeGames = (ctx.req.query("games") !== undefined);

  try {
    // Try to look up the data; if we didn't find anything we can signal an
    // error back.
    const record = await getMetadataDetails(ctx, metaType, idOrSlug, includeGames)
    if (record === null) {
      return fail(ctx, `no such ${metaType} ${idOrSlug}`, 404);
    }

    return success(ctx, `information on ${metaType} ${idOrSlug}`, record);
  }
  catch (err) {
    return fail(ctx, err.message, 500);
  }
}


/******************************************************************************/


/* Return back a list of all of the metadata items of the given type; this may
 * be an empty list. */
export async function gameMetadataListReq(ctx, metaType) {
  try {
    // Try to look up the data; if we didn't find anything we can signal an
    // error back.
    const result = await getMetadataList(ctx, metaType);

    return success(ctx, `found ${result.length} ${metaType} records`, result);
  }
  catch (err) {
    return fail(ctx, err.message, 500);
  }
}


/******************************************************************************/


/* Return back a list of all of the metadata items of the given type; this may
 * be an empty list. */
export async function gameListReq(ctx) {
  try {
    const result = await getGameList(ctx);

    return success(ctx, `found ${result.length} games`, result);
  }
  catch (err) {
    return fail(ctx, err.message, 500);
  }
}


/******************************************************************************/


/* Return back a list of all of the metadata items of the given type; this may
 * be an empty list. */
export async function gameDetailsReq(ctx) {
  // Can be either an game ID or a slug to represent a game
  const { idOrSlug } = ctx.req.param();

  try {
    // Look up the game; if we don't find anything by that value, then this does
    // not exist.
    const result = await getGameDetails(ctx, idOrSlug);
    if (result === null) {
      return fail(ctx, `no such game ${idOrSlug}`, 404)
    }

    return success(ctx, `information on game ${idOrSlug}`, result);
  }
  catch (err) {
    return fail(ctx, err.message, 500);
  }
}


/******************************************************************************/

