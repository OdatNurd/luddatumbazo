/******************************************************************************/


import { BGGLookupError } from '#db/exceptions';

import { getDBResult } from '#db/common';
import { lookupBGGGame } from '#db/bgg';


/******************************************************************************/


/* Given an internal gameId and a BoardGameGeek ID, wrap them into an object
 * that has known fields; this is used to make code more readable since there
 * are various versions of each type of ID in use. */
const makeGame = (gameId, bggId) => ({ gameId, bggId });


/* Given a game, determine if it is "complete" or not; a complete game has a
 * known internal gameId value that is not null. */
const isCompleteGame = game => game.gameId !== null;


/* Given a link record as requested from the database, return a version of the
 * object that wraps the game data in game objects and includes booleans that
 * indicate whether each game is complete or not.
 *
 * The returned object also has the id and name from the original link record
 * in it. */
const makeLinkWrapper = link => {
  const { id, entryName } = link;

  const base = makeGame(link.baseGameId, link.baseGameBggId);
  const expansion = makeGame(link.expansionGameId, link.expansionGameBggId);

  const baseComplete = isCompleteGame(base);
  const expansionComplete = isCompleteGame(expansion);

  return { id, base, baseComplete, expansion, expansionComplete, entryName };
}


/* Given two games, compare them to see if they are a match.
 *
 * Games are considered to match when they either both have the same non-null
 * gameId, OR when their bggId values are the same. */
const gamesMatch = (left, right) => {
  return ((left.gameId === right.gameId && left.gameId !== null) ||
          (left.bggId === right.bggId));
}


/* Given a list of wrapped link objects from the database and a wrapped game
 * object, find and return the entry in the links list that matches the game.
 *
 * If not found, the return value is undefined. */
const findGame = (links, game) => links.find(link =>
          gamesMatch(link.base, game) || gamesMatch(link.expansion, game));


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
export async function updateExpansionDetails(ctx, gameId, bggId, expansionList) {
  // Prepare the return result, which will tell the caller how many of the
  // updates required an insert, how many updated the links in existing records
  // and how many items were skipped because they were found but already linked.
  const result = {
    inserted: 0,
    updated: 0,
    skipped: 0
  };

  // If there are no expansions to update, then we don't have to do anything
  // here.
  if (expansionList.length === 0) {
    return result;
  }

  // Create a game that represents the gameId and bggId that we were given.
  const myGame = makeGame(gameId, bggId);

  // Find all of the entries in the GameExpansion table where our data is one
  // complete side of the link and the other side of the relation has a null
  // gameId indicating that there is a partial link ready to be established.
  //
  // This could return an empty list if there are no entries or if all of them
  // are already linked. Otherwise it will contain links for this game (for
  // either side of the link) for which we need to close the loop.
  //
  // We wrap the result of the call in our link objects to make accessing the
  // content easier later.
  const lookup = await ctx.env.DB.prepare(`
    SELECT * FROM GameExpansion
     WHERE (baseGameId = ?1 AND baseGameBggId = ?2)
        OR (baseGameId is null AND baseGameBggId = ?2)
        OR (expansionGameId = ?1 AND expansionGameBggID = ?2)
        OR (expansionGameId is null AND expansionGameBggID = ?2)
  `).bind(myGame.gameId, myGame.bggId).all();
  const existing = getDBResult('updateExpansionDetails', 'find_links',
                               lookup).map(el => makeLinkWrapper(el));

  // Inserts a new link record into the game expansion table using two sets of
  // gameIds and BGG ids. Either gameId can be set or null, in which case we
  // will try to look it up by the BGG Id if possible.
  //
  // This allows links to be created in one step if both sides are games that
  // exist in the database even if only one of the ID values is provided in the
  // call.
  const insertStmt = ctx.env.DB.prepare(`
    INSERT INTO GameExpansion (baseGameId, expansionGameId,
                               baseGameBggId, expansionGameBggId,
                               entryName)
                VALUES (COALESCE(?1, (SELECT id FROM Game WHERE bggId = ?2)),
                        COALESCE(?3, (SELECT id FROM Game WHERE bggId = ?4)),
                        ?2, ?4,
                        ?5);
  `);

  // Updates an entry in the GameExpansion table to set the base game's gameId
  // to the value provided in the row with the given ID, which comes from the
  // found database record that we're trying to update.
  const updateBaseStmt = ctx.env.DB.prepare(`
    UPDATE GameExpansion
       SET baseGameId = ?1
     WHERE id = ?2
  `);

  // Updates an entry in the GameExpansion table to set the base game's gameId
  // to the value provided in the row with the given ID, which comes from the
  // found database record that we're trying to update.
  const updateExpansionStmt = ctx.env.DB.prepare(`
    UPDATE GameExpansion
       SET expansionGameId = ?1
     WHERE id = ?2
  `);

  // Create an array we can use to store our updates so that we can run them in
  // a batch transaction.
  const batch = [];

  // Iterate all of the input expansions to see what kind of update is needed.
  for (const entry of expansionList) {
    const entryGame = makeGame(entry.gameId, entry.bggId);

    // Find the existing entry that contains this game, if any.
    const dbRecord = findGame(existing, entryGame);
    if (dbRecord === undefined) {
      // We found no record, so we need to insert a new link; use the value in
      // the object to determine which side of the link our game is.
      const baseGame = entry.isExpansion === true ? myGame : entryGame;
      const expansionGame = entry.isExpansion === true ? entryGame : myGame;;

      // Add the insert to the batch.
      result.inserted += 1;
      batch.push(
        insertStmt.bind(baseGame.gameId, baseGame.bggId,
                        expansionGame.gameId ?? null, expansionGame.bggId,
                        entry.name));
    } else {
      // We found a record; if it's already complete on both sides then we don't
      // need to do anything.
      if (dbRecord.baseComplete === true && dbRecord.expansionComplete === true) {
        result.skipped += 1;
        continue;
      }

      // The only side of the link that we can update is the side that is the
      // game we were invoked for, since that is the only one whose gameId we
      // know is present. Determine which that is.
      if (gamesMatch(myGame, dbRecord.base) === true) {
        // We are the base game; Queue an update if it's not complete already.
        if (dbRecord.baseComplete === false) {
          // Update the result count and add to the batch
          result.updated += 1;
          batch.push(updateBaseStmt.bind(myGame.gameId, dbRecord.id));
        } else {
          result.skipped += 1;
        }
      } else {
        // If we get here, we must be the expansion; queue an update if it's
        // not complete already.
        if (dbRecord.expansionComplete === false) {
          // Update the result count and add to the batch
          result.updated += 1;
          batch.push(updateExpansionStmt.bind(myGame.gameId, dbRecord.id));
        } else {
          result.skipped += 1;
        }
      }
    }
  }

  // If there are any items that need to be updated or inserted, then execute
  // the batch now.
  if (batch.length > 0) {
    const batchResult = await ctx.env.DB.batch(batch);
    getDBResult('updateExpansionDetails', 'update_links', batchResult);
  }

  return result;
}


/******************************************************************************/


/* This accepts as input a BGG Game ID.
 *
 * If that game is in our database, a request is made to BGG to fetch the list
 * of expansions for that game, and that data along with the looked up internal
 * game ID is used to invoke the update function in order to bring expansions
 * into our DB.
 *
 * An error is raised if the BGG ID is for a game that isn't in our database or
 * if there was an error looking up the expansion information or if an error is
 * raised by the actual update. */
export async function updateExpansionDetailsByBGG(ctx, bggId) {
  // Find the entry in our database for this BGG ID so that we can determine
  // what our gameID for it is; If not found, return an error back.
  const gameSearch = await ctx.env.DB.prepare(`
    SELECT * FROM Game WHERE bggId = ?
  `).bind(bggId).all();
  const gameData = getDBResult('updateExpansionDetailsByBGG', 'find_game', gameSearch);
  if (gameData.length === 0) {
    throw new BGGLookupError(`database does not contain game with bggId ${bggId}`, 404);
  }

  // Call the function that will look up bgg game data for our value so that we
  // can pluck the expansions table out of it.
  const bggData = await lookupBGGGame(bggId);

  // Collect the gameId that we need for the sub call.
  const gameId =  gameData[0].id;
  const slug =  gameData[0].slug;
  const expansionList = bggData.expansions;

  // Invoke the other function to do our job.
  const result = await updateExpansionDetails(ctx, gameId, bggId, expansionList);

  // Insert into the result our gameId and slug and the bggId so that the result
  // is easier to grok.
  result.gameId = gameId;
  result.slug = slug;
  result.bggId = bggId;
  result.expansions = expansionList;

  return result;
}


/******************************************************************************/


/* Given a game ID, this returns back an object that has two arrays of objects
 * in it, one representing games that are expansions for the given game ID,
 * and one that are base games that work with this game as an expansion.
 *
 * Either or both arrays could be empty or full, since it's possible for games
 * to have no expansions, for expansions to expand on more than one game, and
 * for an expansion to itself be a base for some other expansion. */
export async function getExpansionDetails(ctx, gameId) {
  // This query will find all of the entries in the expansions table that expand
  // upon the game with the gameId provided (i.e. it treats the gameId as the
  // base game); there are two queries that are union-ed together.
  //
  // The first gathers the list of items that are complete, and thus can have
  // their names plucked from the Name table, and the second is for items that
  // don't appear in the database, whose names need to come from somewhere else.
  const expansionsStmt = ctx.env.DB.prepare(`
    SELECT C.expansionGameId as id,
           C.expansionGameBggId as bggId,
           A.slug,
           B.name
      FROM Game as A, GameName as B, GameExpansion as C
     WHERE C.baseGameId = ?1
       AND A.id = C.expansionGameId
       AND B.gameId = C.expansionGameId
       AND B.isPrimary = 1
    UNION ALL
    SELECT NULL as id,
           A.expansionGameBggId as bggId,
           NULL as slug,
           A.entryName as name
      FROM GameExpansion as A
     WHERE A.baseGameId = ?1
       AND A.expansionGameId is NULL
  `);

  // This query is as above but instead of finding games that expand the game
  // with the ID provided, it finds games that are expanded by this game (i.e
  // it treats this game as the expansion).
  const basesStmt = ctx.env.DB.prepare(`
    SELECT C.baseGameId as id,
           C.baseGameBggId as bggId,
           A.slug,
           B.name
      FROM Game as A, GameName as B, GameExpansion as C
     WHERE C.expansionGameId = ?1
       AND A.id = C.baseGameId
       AND B.gameId = C.baseGameId
       AND B.isPrimary = 1
    UNION ALL
    SELECT NULL as id,
           A.baseGameBggId as bggId,
           NULL as slug,
           A.entryName as name
      FROM GameExpansion as A
     WHERE A.expansionGameId = ?1
       AND A.baseGameId is NULL
  `);

  // Batch out the two requests so that we can gather the results of both;
  // either or both may end up empty.
  const query = await ctx.env.DB.batch([
    basesStmt.bind(gameId),
    expansionsStmt.bind(gameId)
  ]);

  // Pluck the results out and then return them back.
  const result =  getDBResult('getExpansionDetails', 'get_details', query);
  return {
    "baseGames": result[0],
    "expansionGames": result[1],
  }
}

/******************************************************************************/
