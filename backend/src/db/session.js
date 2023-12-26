/******************************************************************************/


import { BGGLookupError } from '../db/exceptions.js';
import { getGameSynopsis } from '../db/game.js';

import { ensureRequiredKeys, ensureDefaultValues, ensureObjectStructure,
         mapImageAssets, getImageAssetURL, getDBResult,
         mapIntFieldsToBool } from './common.js';


/******************************************************************************/


/* When we get a request to add a new session, these fields represent the fields
 * that are optional; if they're not specified, their values are set with the
 * values that are seen here. */
const defaultSessionFields = {
  "sessionEnd": null,
  "content": '',
  "expansions": [],
}

/* When we get a request to add a new session, the entries that tell us who is
 * playing the game, both users and guests, can optionally include these fields.
 * If they're not present, the values specified here will be used. */
const defaultPlayerFields = {
  "isStartingPlayer": false,
  "score": 0,
  "isWinner": false
}

/******************************************************************************/


/* This takes as input an object in a shape similar to:
 *   {
 *     "gameId": 52,
 *     "sessionBegin": "2023-12-25T05:46:07.862Z",
 *     "sessionEnd": "2023-12-25T07:23:21.862Z",
 *     "isLearning": true,
 *     "content": "This was a fake game. Nobody played it. I probably would have won, though.",
 *     "expansions": [185, 199 ],
 *     "reportingUser": 1,
 *     "players": {
 *       "users": [
 *         {
 *           "userId": 1,
 *           "isStartingPlayer": true,
 *           "score": 0,
 *           "isWinner": true
 *         }
 *       ],
 *       "guests": [
 *         {
 *           "firstName": "Marisue",
 *           "lastName": "Martin",
 *           "isStartingPlayer": false,
 *           "score": 0,
 *           "isWinner": false
 *         }
 *       ]
 *     }
 *   }
 *
 * The data is used to create a new entry into the database to track either a
 * complete session, or to start the entry for one that is about to be ongoing.
 *
 * In the above data, it is allowed to skip the following fields, which will be
 * inferred to have the given defaults otherwise:
 *   - sessionEnd: NULL  (indicates the session is ongoing, the end is unknown)
 *   - content: '',      (no textual content has been provided for the body)
 *   - expansions: [],   (no game expansions were used in the game)
 *
 * There can be any number of users and guests in the arrays, with the following
 * constraints:
 *   - all users must exist
 *   - the reporting user does not need to have played in the game
 *   - any guests that don't already exist in the system will be added
 *
 * The returned data will be in a format similar to that which comes out when
 * asking for the details of a session. For example:
 *   - The session ID will be present
 *   - all of the users and guests will be fully filled out
 *   - full game data will be present
 *
 * If there is any error during the insertion process, such as games or users
 * not being present, this will raise an error. */
export async function addSession(ctx, sessionData) {
  // Get a version of the incoming session that is validated to have all of the
  // required fields, and for which any optional but missing fields have a
  // sensible default value.
  const details = ensureObjectStructure(sessionData, [
                                          "gameId", "sessionBegin", "isLearning",
                                          "reportingUser", "players"],
                                          defaultSessionFields);

  // Validate that players contains both a users and guests array; for each item
  // in the array, validate that they have the correct fields, and that for
  // any defaults, that sensible values are in place.
  details.players.users ??= [];
  details.players.guests ??= [];

  // Validate that any of the records for users or guests that are participating
  // in the session are fully formed. This will check structural validity and
  // insert any defaults that are needed; the call to verify them as existing
  // will happen later.

  // Validate that there is at least one player in the game.
  if (details.players.users.length === 0 && details.players.guests.length === 0) {
    throw new Error(`session data does not contain any players`);
  }

  // Gather the list of all users in the player list, if any; then include the
  // ID of the reporting user, if it's not there. All of these users need to
  // exist, so look up their data.
  // Collect the userId from each record
  const userPlayerIds = details.players.users.map(user => user.playerId);

  // If the logging userId is not in the list of users that we just gathered,
  // then add its ID in, since we need to validate that as well.
  if (userPlayerIds.indexOf(details.reportingUser) === -1) {
    userPlayerIds.push(details.reportingUser);
  }

  // ---
  // Look up details for all of the users in the list; Once that is done,
  // extract out the entry for the reportingUser, if possible.
  //
  // Now, if the resulting list is not the same length as the number of
  // players, or the record for the reporting user is not found, then one or
  // more of the users is garbage, so fail.
  //
  // Otherwise, we can update the player list with the list of users we just
  // found. Make sure to include the fields from the incoming object too.


  // -----
  // Verify that the game that is being session logged exists; this will fetch
  // the data for it, and return null if it's not found.
  const gameData = await getGameSynopsis(ctx, details.gameId);
  if (gameData === null) {
    throw new BGGLookupError(`no game with ID ${details.gameId} found`, 400);
  }

  // ----
  // Verify that all of the expansions that are mentioned exist; this will
  // fetch the data for them, and return a list; the list must have the same
  // length as the input, or we know that something is missing.


  // ---
  // If there is a list of guests in the player list, ensure that they all exist;
  // here we know that the request will insert if they're not present, and will
  // return data back regardless, so this has to be last so that we don't add
  // new guests if there are other problems.
  if (details.players.guests.length !== 0) {
    // Pass in the list of guests to the call to do the insert.
  }

  return gameData;

  // - Verify that the game specified exists; fetch details while doing so
  // - Verify that all expansions specified exist; fetch data while doing so
  // - Verify that the reporting user exists
  // - Verify that the playing users exist
  // - Add in any guest users that might not exist
  // - Fill in sessionEnd and content with defaults
  // - Fill player information in with defaults


  // sessionId
  // bggId
  // name: (as str, but we need the ID too)
  // slug
  // imagePath
  //
  // all expansion data
  //   bggId
  //   name
  //   slug
  //   imagePath
  //
  // player data:
  //   user information
  //   guest Id's and such
  //
  // backfill:
  // sessionEnd with NULL if not present
  // content with '' if not present
  return sessionData;

  throw new Error('NO!');
}


/******************************************************************************/


/* Get a shortened list of all of the session reports that are currently known
 * to the system.
 *
 * The objects returned by this only contain the base information from the main
 * session table, and do not include the players, expansions, or results of the
 * game itself.
 *
 * Each session will contain information on the game to which it applies. */
export async function getSessionList(ctx) {
  // Try to find the game with the value has that been provided; we check to see
  // if the provided ID is either a slug or an actual ID.
  const lookup = await ctx.env.DB.prepare(`
    SELECT A.id,
           A.gameId,
           C.bggId,
           B.name as name,
           C.slug,
           C.imagePath,
           A.sessionBegin,
           A.sessionEnd,
           A.isLearning
      FROM SessionReport as A, GameName as B, Game as C
     WHERE (A.gameId = B.gameId AND B.id = A.gameName)
       AND (C.id = A.gameId)
  `).all();
  const result = getDBResult('getSessionList', 'find_session', lookup);

  // In each resulting object, convert all of the boolean fields to proper bools
  // for the return, and make sure that the image URL is properly mapped so that
  // the page can view the image.
  return result.map(session => {
    session.imagePath = getImageAssetURL(ctx, session.imagePath, 'smallboxart');
    return mapIntFieldsToBool(session);
  });
}


/******************************************************************************/


/* Get the full details on the game with either the ID or slug provided. The
 * return will be null if there is no such game, otherwise the return is an
 * object that contains the full details on the game, including all of its
 * metadata. */
export async function getSessionDetails(ctx, sessionId) {
  // Try to find the game with the value has that been provided; we check to see
  // if the provided ID is either a slug or an actual ID.
  const lookup = await ctx.env.DB.prepare(`
    SELECT A.id as sessionId,
           A.gameId,
           D.bggId,
           B.name as name,
           D.slug,
           D.imagePath,
           A.sessionBegin,
           A.sessionEnd,
           A.isLearning,
           C.content
      FROM SessionReport as A, GameName as B, SessionReportDetails as C, Game as D
     WHERE A.id = ?1
       AND (A.gameId = B.gameId AND B.id = A.gameName)
       AND (C.sessionId = A.id)
       AND (D.id = A.gameId)
  `).bind(sessionId).all();
  const result = getDBResult('getSessionDetails', 'find_session', lookup);

  // If there was no result found, then return null back to signal that.
  if (result.length === 0) {
    return null;
  }

  // Our session data is the first (and only) returned object; update any of the
  // boolean fields and add in a mapped version of the image URL that we
  // gathered.
  const sessionData = mapIntFieldsToBool(result[0]);
  sessionData.imagePath = getImageAssetURL(ctx, sessionData.imagePath, 'smallboxart');

  // Check for the list of expansions that were used to play this game.
  const expansionLookup = await ctx.env.DB.prepare(`
    SELECT A.expansionId as gameId, C.bggId, B.name as name, C.slug, C.imagePath
      FROM SessionReportExpansions as A, GameName as B, Game as C
     WHERE A.sessionId = ?1
       AND (A.expansionId = B.gameId AND B.isPrimary = 1)
       AND (A.expansionId = C.id);
  `).bind(sessionId).all();
  const expansions = getDBResult('getSessionDetails', 'find_expansions', expansionLookup);

  // Check for the list of players that participated in this session.
  const playerLookup = await ctx.env.DB.prepare(`
    SELECT 1 as isUser, A.userId, B.name, A.isReporter, A.isStartingPlayer, A.score, A.isWinner
      FROM SessionReportPlayer as A, User as B
     WHERE sessionId = ?1
       AND guestId is NULL
       AND A.userId = B.id
    UNION ALL
    SELECT 0 as isUser, b.id as userId, B.name, A.isReporter, A.isStartingPlayer, A.score, A.isWinner
      FROM SessionReportPlayer as A, GuestUser as B
     WHERE sessionId = ?1
       AND guestId IS NOT NULL
       AND A.guestId = B.id;
  `).bind(sessionId).all();

  // Get the players out of the result and convert any boolean values that
  // appear in either of them.
  const players = getDBResult('getSessionDetails', 'find_players', playerLookup);
  players.forEach(player => mapIntFieldsToBool(player));

  // Map the found expansions and players in; for expansions we need to get the
  // thumbnail for the expanasion that was used.
  sessionData.expansions = mapImageAssets(ctx, expansions, 'imagePath', 'thumbnail');
  sessionData.players = players;

  return sessionData;
}


/******************************************************************************/
