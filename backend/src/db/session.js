/******************************************************************************/


import { BGGLookupError } from '../db/exceptions.js';
import { getGameSynopsis } from '../db/game.js';
import { updateGuests } from '../db/guest.js';

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
};

/* When we get a request to add a new session, the entries that tell us who is
 * playing the game, both users and guests, can optionally include these fields.
 * If they're not present, the values specified here will be used. */
const defaultPlayerFields = {
  "isStartingPlayer": false,
  "score": 0,
  "isWinner": false
};


/******************************************************************************/


/* This takes as input an incoming sessionData object in the format that is
 * accepted by addSession() and verifies that all of the required fields across
 * the whole object exist, and that any optional fields have sensible default
 * values.
 *
 * If there are any errors, this will raise an exception; otherwise the adjusted
 * object is returned back. */
function validateSessionData(sessionData) {
  // Validate the base input session data, and ensure that it has good defaults.
  const session = ensureObjectStructure(sessionData, [
                                          "gameId", "sessionBegin", "isLearning",
                                          "reportingUser", "players"],
                                          defaultSessionFields);

  // We verified players was a field; verify that it has arrays for both user
  // and guest players.
  session.players.users ??= [];
  session.players.guests ??= [];

  // Verify that all of the specified users and guests (if any) have the
  // required fields, and populate in any required defaults for missing fields.
  session.players.users = session.players.users.map(user => ensureObjectStructure(user,
                                              ["userId"], defaultPlayerFields));
  session.players.guests = session.players.guests.map(guest => ensureObjectStructure(guest,
                                              ["firstName", "lastName"], defaultPlayerFields));

  // To be valid, there needs to be at least one user in the list of players, on
  // either side.
  if (session.players.users.length === 0 && session.players.guests.length === 0) {
    throw new Error(`session data does not contain any players or users`);
  }

  // Return the updated session.
  return session;
}


/******************************************************************************/


/* Given a validated session data object, verify that all of the players that
 * reference users in the system are valid, including the record of the user
 * that is reporting on the session itself.
 *
 * This will find the distinct list of users and verify that they all exist,
 * patching the data found into the session data player user list within the
 * object itself.
 *
 * If there are any issues, an exception is raised. */
async function validateSessionUsers(ctx, sessionData) {
  // Gather the list of all userIds in the player list, if any,
  const inputUserIds = sessionData.players.users.map(user => user.userId);

  // If the logging userId is not in the list of users that we just gathered,
  // then add its ID in, since we need to validate that as well.
  if (inputUserIds.indexOf(sessionData.reportingUser) === -1) {
    inputUserIds.push(sessionData.reportingUser);
  }

  // Look up all of the usernames for the list of user ID's that we collected,
  // then extract from that the list of known userId values.
  const userQuery = await ctx.env.DB.prepare(`
    SELECT id, name FROM User
     WHERE id in (SELECT value from json_each('${JSON.stringify(inputUserIds)}'))
  `).all();
  const playerUsers = getDBResult('validateSessionUsers', 'find_users', userQuery);

  // Get a mapped version that uses the userid as a key where the value is the
  // result of the query.
  const playerUserMap = playerUsers.reduce((accum, current) => {
    accum[current.id] = current;
    return accum;
  }, {});

  // In order to be valid, the recordingUser has to have an id in the player ID
  // list.
  if (playerUserMap[sessionData.reportingUser] === undefined) {
    throw new Error(`invalid reporting user: no such user ${sessionData.reportingUser}`);
  }

  // Map through the list of input users, and for each one insert the name that
  // we got from the lookup; if we find any entries that don't appear in the
  // lookup list, then we know that the user does not exist, so generate an
  // error.
  sessionData.players.users = sessionData.players.users.map(user => {
    const record = playerUserMap[user.userId];
    if (record === undefined) {
      throw new Error(`invalid player user: no such user ${user.userId}`);
    }

    user.isUser = true;
    user.isReporter = (user.userId === sessionData.reportingUser);
    user.name = record.name;
    return user;
  });
}


/******************************************************************************/


/* Given a validated session data object, verify that all of the games that
 * are mentioned (both the main game as well as all of the expansions, if
 * any) are valid.
 *
 * The provided session object will be updated to contain information on the
 * found games.
 *
 * If there are any issues, an exception is raised. */
async function validateGameData(ctx, sessionData) {
  // Verify that the game that is being session logged exists; this will fetch
  // the data for it, and return null if it's not found.
  const gameData = await getGameSynopsis(ctx, sessionData.gameId, true);
  if (gameData === null) {
    throw new BGGLookupError(`no game with ID ${sessionData.gameId} found`, 400);
  }

  // Do the same for all expansions that are mentioned in the expansions list.
  // Once done, if the two lists don't have the same length, something must be
  // missing.
  const expansions = await getGameSynopsis(ctx, sessionData.expansions, true);
  if (expansions.length !== sessionData.expansions.length) {
    throw new BGGLookupError(`not all expansions provided exist`, 400);
  }

  // All lookups have succeeded, so insert the found game information into the
  // session data.
  sessionData.gameId = gameData.gameId;
  sessionData.bggId = gameData.bggId;
  sessionData.name = gameData.name;
  sessionData.nameId = gameData.nameId;
  sessionData.slug = gameData.slug;
  sessionData.imagePath = gameData.imagePath;
  sessionData.expansions = expansions;
}


/******************************************************************************/


/* Given a validated session data object, verify that all of the guest player
 * records are filled out.
 *
 * Guests always validate in the database because we freely generate any that
 * are not present; we just need to ensure that all of the data is combined
 * together.
 *
 * If there are any issues, an exception is raised. */
async function validateSessionGuests(ctx, sessionData) {
  // Get the unique list of pairs of names from the list of guest players; these
  // are used to look up the actual guests.
  const playerGuestNames = sessionData.players.guests.map(guest => {
    return {
      firstName: guest.firstName,
      lastName: guest.lastName
    }
  });
  const playerGuests = await updateGuests(ctx, playerGuestNames);

  // Map across all of the guests in the found list; for each one, find the
  // guest in the original, and copy the fields over, then return the newly
  // copied object.
  sessionData.players.guests = sessionData.players.guests.map(guest => {
    // Find the entry in the playerGuests lookup that matches; copy the id and
    // name from it into here.
    const dbGuest = playerGuests.find(entry => entry.firstName === guest.firstName &&
                                               entry.lastName === guest.lastName);
    if (dbGuest === undefined) {
      throw new Error(`unable to find entry for guest ${guest.firstName} ${guest.lastName}`);
    }

    // These are only needed to look data up
    delete guest.firstName;
    delete guest.lastName;

    // Copy over the ID and name from the DB user.
    guest.userId = dbGuest.id;
    guest.name = dbGuest.name;

    // Fill in other values; these are always false for a guest.
    guest.isUser = false;
    guest.isReporter = false;

    return guest;
  });
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
  const details = validateSessionData(sessionData);

  // Validate that all of the users that are referenced in the session data
  // actually exist; this will patch in the user ID's and also validate the
  // reporter at the same time.
  await validateSessionUsers(ctx, details);

  // Validate that all of the games that are mentioned within the session data
  // are valid and patch their details in.
  await validateGameData(ctx, details);

  // Validate all of the guest players; this happens last because all guests
  // always validate; any missing guests are inserted always.
  await validateSessionGuests(ctx, details);

  return details;
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
  // thumbnail for the expansion that was used.
  sessionData.expansions = mapImageAssets(ctx, expansions, 'imagePath', 'thumbnail');
  sessionData.players = players;

  return sessionData;
}


/******************************************************************************/
