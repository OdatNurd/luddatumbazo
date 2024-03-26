/******************************************************************************/


import { BGGLookupError } from '#db/exceptions';

import { getDBResult, mapIntFieldsToBool } from '#db/common';
import { cfImagesURLUpload, mapImageAssets, getImageAssetURL  } from '#db/image';
import { metadataTypeList, updateMetadata } from '#db/metadata';
import { updateExpansionDetails, getExpansionDetails } from '#db/expansion';
import { lookupBGGGame } from '#db/bgg';


/******************************************************************************/


/* Given a numeric gameId or a textual slug, look up the raw details for that
 * game from the internal Game record and return an object back.
 *
 * The return will be null if there is no such game found in the database. */
async function getRawGameRecord(ctx, idOrSlug) {
  // Try to find the game with the value has that been provided; we check to see
  // if the provided ID is either a slug or an actual ID.
  const lookup = await ctx.env.DB.prepare(`
    SELECT * FROM Game
     WHERE (id == ?1 or slug == ?1)
  `).bind(idOrSlug).all();
  const result = getDBResult('getRawGameRecord', 'find_game', lookup);

  // If there was no result found, then return null back to signal that.
  if (result.length === 0) {
    return null;
  }

  return result[0];
}


/******************************************************************************/


/* Takes either a single game identifier or an array of identifiers, where an
 * identifier is either a textual slug or a numeric game ID, and searches for
 * data on those games. The result is an object or objects with the brief
 * details of each game:
 *   - id
 *   - bggId
 *   - slug
 *   - name
 *   - imagePath
 *
 * imageType can be one of the valid image types, or undefined to indicate that
 * no image is desired. The resulting object will either have no imagePath field
 * or will have the URL to the image of the desired dimension based on the
 * passed in type.
 *
 * includeNameId indicates wether the resulting lookups should also contain the
 * nameId field that shows what name value was selected from the name table
 * (when true) or if that is not desired (when false); the name field will be
 * present in either case.
 *
 * If the identifier provided is a single id, the return value is either the
 * object that represents that game, or null if it could not be found.
 *
 * If the identifier provided is a list of ID's, the return value is an array,
 * which may be shorter than the input array of not all of the items were
 * found. */
export async function performGameLookup(ctx, gameId, imageType, includeNameId) {
  // Get the list of ID's that we are going to search for.
  const searchIds = Array.isArray(gameId) ? gameId : [gameId];

  // Filter the incoming list of identifiers into two lists; one for which we
  // can look up based on the ID value, and the other based on a slug value.
  //
  // We do these operations distinct because every usage of json_each() costs
  // reads and writes due to it being implemented with a vTable. Thus we can
  // cut usage in half by only using it once per query rather than twice.
  const idValues = searchIds.filter(el => typeof el !== "string");
  const slugValues = searchIds.filter(el => typeof el === "string");

  // If we got any numeric ID queries, queue up a request to look up those
  // games.
  const queries = [];
  if (idValues.length !== 0) {
    queries.push(
      ctx.env.DB.prepare(`
        SELECT A.id, A.bggId, A.slug, B.name, A.imagePath, B.id as nameId
          FROM Game as A, GameName as B
         WHERE A.id == B.gameId and B.isPrimary = 1
           AND A.id in (SELECT value from json_each('${JSON.stringify(idValues)}'))
      `).all()
    );
  }

  // If we got any textual slug queries, queue up a request to perform the same
  // query by slug instead.
  if (slugValues.length !== 0) {
    queries.push(
      ctx.env.DB.prepare(`
        SELECT A.id, A.bggId, A.slug, B.name, A.imagePath, B.id as nameId
          FROM Game as A, GameName as B
         WHERE A.id == B.gameId and B.isPrimary = 1
           AND A.slug in (SELECT value from json_each('${JSON.stringify(slugValues)}'))
      `).all()
    );
  }

  // Wait for both queries to resolve now
  const preResults = await Promise.all(queries);

  // Fetch out the actual results; we combine these into a single array of
  // values.
  const combined = [];
  for (const item of preResults) {
    combined.push(...getDBResult('performGameLookup', 'lookup', item));
  }

  // Map the final result that will be returned.
  const result = combined.map(game => {
    // If we were not given an imageType, then remove the imagePath field;
    // otherwise populate it with the appropriate image URL.
    if (imageType === undefined) {
      delete game.imagePath;
    } else {
      game.imagePath = getImageAssetURL(ctx, game.imagePath, imageType);
    }

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


/* Get a list of all of the games known to the database, including their slug
 * and the primary name associated with each of them. */
export async function getGameList(ctx) {
  // Try to find all games.
  const gameList = await ctx.env.DB.prepare(`
    SELECT A.id, A.bggId, A.slug, B.name, A.imagePath
      FROM Game as A, GameName as B
     WHERE A.id = B.gameId AND B.isPrimary = 1
  `).all();

  const result = getDBResult('getGameList', 'find_games', gameList);
  return mapImageAssets(ctx, result, 'imagePath', 'thumbnail');
}


/******************************************************************************/


/* This works as per getGameList(), except that it requires a householdId and
 * will return only games owned by that household. In addition, the names that
 * fall out will be the version of the name that is "owned". */
export async function getHouseholdGameList(ctx, householdId) {
  // Try to find all games owned by this household.
  const gameList = await ctx.env.DB.prepare(`
    SELECT A.id, A.bggId, A.slug, B.name, A.imagePath
      FROM Game as A, GameName as B, GameOwners as C
     WHERE A.id = B.gameId AND A.id = C.gameId AND
           B.id = C.gameName AND C.householdId = ?1
  `).bind(householdId).all();

  const result = getDBResult('getHouseholdGameList', 'find_games', gameList);
  return mapImageAssets(ctx, result, 'imagePath', 'thumbnail');
}


/******************************************************************************/


/* This works as per getGameList(), except that it requires a householdId and
 * will return only games wished for by that household. In addition, the names
 * that fall out will be the version of the name that is "wished for". */
export async function getWishlistGameList(ctx, householdId) {
  // Try to find all games wished for by this household.
  const gameList = await ctx.env.DB.prepare(`
    SELECT A.id, A.bggId, A.slug, B.name, A.imagePath
      FROM Game as A, GameName as B, Wishlist as C
     WHERE A.id = B.gameId AND A.id = C.gameId AND
           B.id = C.gameName AND C.householdId = ?1
  `).bind(householdId).all();

  const result = getDBResult('getWishlistGameList', 'find_games', gameList);
  return mapImageAssets(ctx, result, 'imagePath', 'thumbnail');
}


/******************************************************************************/


/* Given either a numeric ID of a game, or a textual slug that identifies the
 * record, return back a list of all of the names that this game is known by.
 *
 * This list will always have at least one entry.
 *
 * If no such game exists, then this will return null to indicate that. */
export async function getGameNames(ctx, idOrSlug) {
  // Try to look up the raw game record; if this does not work, then fail out
  // right away.
  const game = await getRawGameRecord(ctx, idOrSlug);
  if (game === null) {
    return null;
  }

  // Gather the list of all of the names that this game is known by; much like
  // when we do the insert, the primary name is brought to the top of the list.
  const nameLookup = await ctx.env.DB.prepare(`
    SELECT id, name, isPrimary from GameName
     WHERE gameId = ?
     ORDER BY isPrimary DESC;
  `).bind(game.id).all();
  const names = getDBResult('getGameNames', 'find_names', nameLookup);

  return names.map(entry => mapIntFieldsToBool(entry))
}


/******************************************************************************/


/* Given a game record and a household Id that exists, check to see if that
 * game is owned by this household and/or wishlisted by this household, and if
 * so include that information. */
export async function getGameHouseholdDetails(ctx, gameData, householdId) {
  // Batch out to select two sets of data from the database; whether or not this
  // game is on the wishlist of this household, and whether or not the game is
  // owned by this household.
  const householdInfo = await ctx.env.DB.batch([
    // Determine if this game is on the wishlist, and if so by what name, and
    // who it was that added it.
    ctx.env.DB.prepare(`
        SELECT B.name, C.id as wishlisterId, C.displayName as wishlisterName
          FROM Wishlist as A,
               GameName as B,
               User as C
         WHERE A.gameId = ?1
           AND A.householdId = ?2
           AND A.addedByUserId = C.id
           AND A.gameId = B.gameId
           AND A.gameName = B.id
      `).bind(gameData.id, householdId),

    // Determine whether or not this game is owned, and if so under what name
    // and by what publisher.
    ctx.env.DB.prepare(`
        SELECT B.name as gameName, C.id as publisherId, C.bggId, C.slug, C.name, C.metaType
          FROM GameOwners as A,
               GameName as B,
               GameMetadata as C
         WHERE A.gameId = ?1
           AND A.householdId = ?2
           AND A.gameId = B.gameId
           AND A.gameName = B.id
           AND A.gamePublisher = C.id
      `).bind(gameData.id, householdId)
  ]);

  // Grab the results; this will be an array of arrays in the order of the
  // batch.
  const [ wishlist, owned ] = getDBResult('getGameHouseholdDetails', 'check_household', householdInfo);

  // Set the keys for wishlist/owned status. If there is no status, this will
  // be undefined and thus the key filtered away.
  //
  // This allows the client side code to distinguish where special handling is
  // needed just by testing if the object exist.
  gameData.wishlist = wishlist[0];
  gameData.owned = owned[0];

  return gameData;
}


/******************************************************************************/


/* Get the full details on the game with either the ID or slug provided. The
 * return will be null if there is no such game, otherwise the return is an
 * object that contains the full details on the game, including all of its
 * metadata.
 *
 * householdId is optional; if it's provided, extra queries are completed to
 * gather information about this game as it relates to that household, such as
 * whether or not it's wishlisted (and if so, by who) and whether or not it is
 * owned. */
export async function getGameDetails(ctx, idOrSlug, householdId) {
  // Try to find the game with the value has that been provided; we check to see
  // if the provided ID is either a slug or an actual ID; if this is not found,
  // then leave.
  const gameData = await getRawGameRecord(ctx, idOrSlug);
  if (gameData === null) {
    return null;
  }

  // Set up the game data and map the game image URL.
  gameData.imagePath = getImageAssetURL(ctx, gameData.imagePath, 'boxart');

  // Gather the list of all of the names that this game is known by; much like
  // when we do the insert, the primary name is brought to the top of the list.
  const names = await ctx.env.DB.prepare(`
    SELECT id, name, isPrimary from GameName
     WHERE gameId = ?
     ORDER BY isPrimary DESC;
  `).bind(gameData.id).all();
  gameData.names = getDBResult('getGameDetails', 'find_names', names).map(el => mapIntFieldsToBool(el));
  gameData.primaryName = gameData.names[0].name;

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

  // Try to look up any household information for the household provided and
  // add it into the object. The modified object is returned back to us.
  if (householdId !== undefined) {
    return await getGameHouseholdDetails(ctx, gameData, householdId);
  }

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
             minPlayerAge, playtime, minPlaytime, maxPlaytime, complexity,
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
