/******************************************************************************/


import { BGGLookupError } from '#db/exceptions';

import { cfImagesURLUpload, mapImageAssets, getImageAssetURL, getDBResult } from '#db/common';
import { metadataTypeList, updateMetadata } from '#db/metadata';
import { updateExpansionDetails, getExpansionDetails } from '#db/expansion';
import { lookupBGGGame } from '#db/bgg';


/******************************************************************************/


/* Given an internal gameID or a list of gameIds, return back an object with
 * the brief details of each game:
 *   - id
 *   - bggId
 *   - slug
 *   - name
 *   - imagePath
 *
 * When a single item is passed in, the return is either a single object or NULL
 * if the game does not exist.
 *
 * For a list of game ID's, the value that is returned is an array with one
 * entry per item found; this may be short or even empty.
 *
 * In all cases, if includeNameId is present, in addition to the name field,
 * the id field in the name table will also be returned. */
export async function getGameSynopsis(ctx, gameId, imageType, includeNameId) {
  // Get the list of ID's that we are going to search for.
  const searchIds = Array.isArray(gameId) ? gameId : [gameId];

  // Try to find all metadata item of this type.
  const lookup = await ctx.env.DB.prepare(`
    SELECT A.id, A.bggId, A.slug, B.name, A.imagePath, B.id as nameId
      FROM Game as A, GameName as B
     WHERE A.id == B.gameId and B.isPrimary = 1
       AND A.id in (SELECT value from json_each('${JSON.stringify(searchIds)}'))
  `).all();

  // Get the resulting array of items out, then map them so that all of the
  // game images are put in place, and we optionally keep or whack the name ID
  // value.
  const games = getDBResult('getGameSynopsis', 'find_game', lookup);
  const result = games.map(game => {
    game.imagePath = getImageAssetURL(ctx, game.imagePath, imageType);

    // If we were not asked to include the nameId, remove it from the object.
    if (includeNameId !== true) {
      delete game.nameId;
    }

    return game;
  });


  // What we do here depends on whether the input was an array or not; if it was
  // an array, we want to return all values; otherwise, we want to return just
  // the first value.
  if (Array.isArray(gameId)) {
    return result;
  } else {
    // If the list is empty, return NULL; there is no such game.
    if (result.length === 0) {
      return null;
    }

    return result[0];
  }
}


/******************************************************************************/


/* Given an array of identifiers that can be either gameId numbers or game slug
 * values, return back a short list that provides a list of all matching games.
 *
 * The retutrn will always return a list, though the list may be empty. Each
 * item in the list is a pair of id and slug values that represent a looked up
 * game. */
export async function performGameLookup(ctx, identifiers) {
  // Short circut the lookup if we were not given any identifiers to look up.
  if (identifiers.length === 0) {
    return [];
  }

  // TODO: The subselects here cost writes and reads because the back end uses
  //       a vtable instance for them; could maybe be made smarter if we want to
  //       try to only look up integers in one and strings in the other to cut
  //       potiential ops.
  const filter = JSON.stringify(identifiers);
  const idValues = await ctx.env.DB.prepare(`
    SELECT id, slug
      FROM Game
      WHERE id IN (SELECT value from json_each('${filter}'))
         OR slug in (SELECT value from json_each('${filter}'))
  `).all();

  return getDBResult('performGameLookup', 'lookup_ids', idValues);
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

  // Gather the information on expansions for this game
  const expansionDetails = await getExpansionDetails(ctx, gameData.id);
  gameData.baseGames = expansionDetails.baseGames;
  gameData.expansionGames = expansionDetails.expansionGames;

  // Do a quick scan to see if there is at least one session report that lists
  // this gameId either as the main game or as an expansion that was used during
  // the session.
  //
  // This is stored as a boolean and doesn't have anything like a count, just
  // the presence or absence of such information.
  const sessionReq = await ctx.env.DB.prepare(`
    SELECT DISTINCT id
      FROM SessionReport
     WHERE gameId = ?1
    UNION ALL
    SELECT DISTINCT sessionId
      FROM SessionReportExpansions
     WHERE expansionId = ?1
    LIMIT 1
  `).bind(gameData.id).all();
  const hasSession = getDBResult('getGameDetails', 'find_sessions', sessionReq);
  gameData.hasSessions = hasSession.length !== 0;

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
  // Ensure that all of the metadata that we need is available. This does not
  // run in a transaction, so if we bail later, these items will still be in
  // the database; we can look into making that smarter later.
  gameData.category  = await updateMetadata(ctx, gameData.category,  'category');
  gameData.mechanic  = await updateMetadata(ctx, gameData.mechanic,  'mechanic');
  gameData.designer  = await updateMetadata(ctx, gameData.designer,  'designer');
  gameData.artist    = await updateMetadata(ctx, gameData.artist,    'artist');
  gameData.publisher = await updateMetadata(ctx, gameData.publisher, 'publisher');

  // 0. For each of category, mechanic, designer, artist and publisher, update
  // 1. Insert the raw data for this game into the database
  // 2. Determine the new gameID and then insert the names for this game
  // 3. Update placements for all items in 0
  const stmt = ctx.env.DB.prepare(`INSERT INTO Game
            (bggId, slug, description, publishedIn, minPlayers, maxPlayers,
             minPlayerAge, playtime, minPlaytime, maxPlaytime, complexitym
             officialUrl, teachingUrl)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    gameData.bggId,
    gameData.slug,
    gameData.description,
    gameData.published,
    gameData.minPlayers,
    gameData.maxPlayers,
    gameData.minPlayerAge,
    gameData.playTime,
    gameData.minPlayTime,
    gameData.maxPlayTime,
    gameData.complexity,
    gameData.officialUrl,
    gameData.teachingUrl
  );

  // Grab the result that falls out of the DB; this must be a success because
  // if it fails, it will jump to the catch.
  //
  // The last row ID in the metadata is the SQLite return for the last
  // inserted rowID, which is the ID of the item we just inserted.
  const result = await stmt.run();
  getDBResult('insertGame', 'insert_game', result);
  const id = result.meta.last_row_id;

  // If the game data has any expansions in it, then invoke the outer function
  // so that those expansions will get registered with the system for this game
  // now that it's irrevocably inserted into the database.
  //
  // This returns insertion status information, which is not useful to us here.
  if (gameData.expansions.length !== 0) {
    const ops = await updateExpansionDetails(ctx, id, gameData.bggId, gameData.expansions);
    console.log(`new game expansion records: inserted=${ops.inserted}, updated=${ops.updated}, skipped=${ops.skipped}`);
  }

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
    for (const item of gameData[metatype]) {
      batch.push(update.bind(id, metatype, item.id) )
    }
  }

  // Add to the batch a list of items that will insert the names for this
  // game into the list.
  const addName = ctx.env.DB.prepare(`
    INSERT INTO GameName
    VALUES (NULL, ?1, ?2, ?3)
  `);
  for (const idx in gameData.name) {
    // This is dumb because I'm dumb, D1 is Dumb, and JavaScript is dumb.
    // WHY SO DUMB?!
    batch.push(addName.bind(id, gameData.name[idx], idx === '0' ? 1 : 0))
  }

  // Trigger the batch; we don't need to see the results of this since it is
  // all insert operations on bound metadata.
  const insert = await ctx.env.DB.batch(batch);
  getDBResult('insertGame', 'insert_details', insert);

  // The operation succeeded; return back information on the record that was
  // added.
  return {
    id,
    bggId: gameData.bggId,
    name: gameData.name[0],
    slug: gameData.slug
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
