/******************************************************************************/


import { getDBResult, mapIntFieldsToBool } from '#db/common';

import { BGGLookupError } from '#db/exceptions';
import { dbGameLookup } from '#db/game';
import { dbGuestUpdate } from '#db/guest';

import { imgMapAssetListURLs, imgGetAssetURL } from '#lib/image';


/******************************************************************************/


// Various boolean values need to be converted to an integer and D1 can't do
// that for you, because the calculation is a little tricky.
const int = val => val === true ? 1 : 0;


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

  // Look up all of the usernames for the list of user ID's that we collected,
  // then extract from that the list of known userId values.
  const userQuery = await ctx.env.DB.prepare(`
    SELECT id, name, displayName FROM User
     WHERE id in (SELECT value from json_each('${JSON.stringify(inputUserIds)}'))
  `).all();
  const playerUsers = getDBResult('validateSessionUsers', 'find_users', userQuery);

  // Get a mapped version that uses the userId as a key where the value is the
  // result of the query.
  const playerUserMap = playerUsers.reduce((accum, current) => {
    accum[current.id] = current;
    return accum;
  }, {});

  // In order to be valid, the recordingUser has to have an id in the player ID
  // list.
  if (playerUserMap[sessionData.reportingUser] === undefined) {
    throw new Error(`invalid reporting user: user ${sessionData.reportingUser} is not a player`);
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
    user.name = record.displayName;
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
  const gameData = await dbGameLookup(ctx, sessionData.gameId, 'smallboxart', true);
  if (gameData === null) {
    throw new BGGLookupError(`no game with ID ${sessionData.gameId} found`, 400);
  }

  // Do the same for all expansions that are mentioned in the expansions list.
  // Once done, if the two lists don't have the same length, something must be
  // missing.
  const expansions = await dbGameLookup(ctx, sessionData.expansions, 'thumbnail', true);
  if (expansions.length !== sessionData.expansions.length) {
    throw new BGGLookupError(`not all expansions provided exist`, 400);
  }

  // All look-ups have succeeded, so insert the found game information into the
  // session data.
  sessionData.gameId = gameData.id;
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
  const playerGuests = await dbGuestUpdate(ctx, playerGuestNames);

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
    guest.name = dbGuest.displayName;

    // Fill in other values; these are always false for a guest.
    guest.isUser = false;
    guest.isReporter = false;

    return guest;
  });
}


/******************************************************************************/


/* The input to this function is the fully validated input generated by the
 * code in dbSessionInsert().
 *
 * That function generates a structure that makes it easier to validate the
 * data and perform all of the required insert operations.
 *
 * This function massages the data so that it appears in the same shape as the
 * data that comes out of the session report query, so that when adding a
 * session the result is as if you just looked one up. */
function reshapeSessionInput(sessionId, sessionData) {
  // Store the sessionId we were given
  sessionData.sessionId = sessionId;

  // The main session data and the expansions all have a nameId in them that
  // should not be there.
  delete sessionData.nameId;
  sessionData.expansions.forEach(expansion => delete expansion.nameId);

  // The list of players in the input is separated out by guests and users to
  // make the insert easier, but the lookup should always have a single array
  // that contains both. The data is shaped correctly, just split and needs to
  // be rejoined.
  sessionData.players = [...sessionData.players.users, ...sessionData.players.guests];

  // Remove the reportingPlayer field; not needed since it's inlined into the
  // users.
  delete sessionData.reportingUser;

  return sessionData;
}


/******************************************************************************/


/* Given a data structure that has been fully verified by the code in the
 * dbSessionInsert() function, this performs the actual insertion of a complete
 * session report record, including all of the various extra tables worth of
 * data.
 *
 * This performs the action inside of a transaction by creating a batch of
 * statements to execute.
 *
 * The return value is the sessionId of the newly added session; if there was
 * any error during the insert, an error is thrown to signal it. */
async function insertSessionDetails(ctx, session) {
  // Start the batch for the insert; we need to create a temporary table to
  // catch the new sessionId, which will be used in other queries.
  //
  // D1 executes all batches in a transaction.
  const statements = [
    // Create a temporary table that can be used to store the new sessionId.
    ctx.env.DB.prepare(`CREATE TABLE __temp (id integer)`),

    //-----------

    // Insert the core SessionReport record into the session table
    ctx.env.DB.prepare(`
      INSERT INTO SessionReport (gameId, gameName, playType, sessionBegin, sessionEnd, isLearning)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    `).bind(session.gameId, session.nameId, session.playType, session.sessionBegin,
            session.sessionEnd, int(session.isLearning)),

    //-----------

    // Capture the inserted sessionId into our temporary table
    ctx.env.DB.prepare(`INSERT INTO __temp SELECT last_insert_rowid()`),

    //-----------

    // Store the session report details for this session; this needs to pull the
    // stored session ID.
    ctx.env.DB.prepare(`
      INSERT INTO SessionReportDetails (sessionId, title, content)
           VALUES ((SELECT id FROM __temp), ?1, ?2)
    `).bind(session.title, session.content)
  ];

  // Insert records for each of the expansions in the report, if any.
  session.expansions.forEach(expansion => {
    statements.push(ctx.env.DB.prepare(`
      INSERT INTO SessionReportExpansions (sessionId, expansionId, expansionName)
           VALUES ((SELECT id FROM __temp), ?1, ?2)
    `).bind(expansion.id, expansion.nameId));
  });

  // Insert session players for all of the system users; this will include the
  // reporting player.
  session.players.users.forEach(user => {
    statements.push(ctx.env.DB.prepare(`
      INSERT INTO SessionReportPlayer (sessionId, userId, guestId, isReporter,
                                       isStartingPlayer, score, isWinner)
           VALUES ((SELECT id FROM __temp), ?1, NULL, ?2, ?3, ?4, ?5)
    `).bind(user.userId, int(user.isReporter), int(user.isStartingPlayer),
            user.score, int(user.isWinner)));
  });

  // Now do the same, but for guest users; the query is almost the same, just
  // the value that's null flip/flips between the two.
  session.players.guests.forEach(guest => {
    statements.push(ctx.env.DB.prepare(`
      INSERT INTO SessionReportPlayer (sessionId, userId, guestId, isReporter,
                                       isStartingPlayer, score, isWinner)
           VALUES ((SELECT id FROM __temp), NULL, ?1, ?2, ?3, ?4, ?5)
    `).bind(guest.userId, int(guest.isReporter), int(guest.isStartingPlayer),
            guest.score, int(guest.isWinner)));
  });

  // Add in two last batch statements; one to fetch the sessionId, and the other
  // to drop the temporary table.
  // Add in one last batch to drop the temp table
  statements.push(ctx.env.DB.prepare(`select id FROM __temp`));
  statements.push(ctx.env.DB.prepare(`DROP TABLE __temp`));

  // Now we can execute the batch
  const results = await ctx.env.DB.batch(statements);
  const result = getDBResult('insertSessionDetails', 'do_insert', results);

  // The second to last result is an array of results that represents the
  // select that asked what the new sessionId is; fetch that and return it
  // back while trying not to be sick at how that looks.
  return result[result.length - 2][0].id;
}


/******************************************************************************/


/* Given a full session data object as queried from the database and a set of
 * update data, ensure that the update data is valid and then use it to update
 * the session data provided.
 *
 * On any validation error, an exception is thrown. Otherwise, the return value
 * is a modified version of the sessionData passed in. */
function prepareSessionUpdate(sessionData, updateData) {
  // The update is allowed to touch only a few of the core values; if any of
  // them were not provided, use the value from the session data we just looked
  // up.
  //
  updateData.isLearning ??= sessionData.isLearning;
  updateData.sessionEnd ??= sessionData.sessionEnd;
  updateData.title ??= sessionData.title;
  updateData.content ??= sessionData.content;

  // Get a user or guest record from the provided update data, delete it and
  // return it back. If it's not found, return null instead.
  const getSessionUser = (userId, isUser) => {
    // Determine which array to search, then try to find the record for that
    // user; if we don't find it, return null.
    const content = updateData.players[(isUser === true) ? 'users' : 'guests'];
    const userIdx = content.findIndex(player => player.userId == userId);
    if (userIdx === -1) {
      return null;
    }

    // Pull out the record and then delete it from the array
    return content.splice(userIdx, 1)[0];
  }

  // Apply our updates; the top level fields in the update data are what we
  // want to populate into the session object as a whole.
  sessionData.isLearning = updateData.isLearning;
  sessionData.sessionEnd = updateData.sessionEnd;
  sessionData.title = updateData.title;
  sessionData.content = updateData.content;

  // If the update doesn't contain and player data, there's nothing else to
  // update so short circuit the return now.
  if (updateData.players === undefined) {
    return sessionData;
  }

  // Iterate over all of the players in the session data, and try to update them
  // from the data in the update; for each one we will delete the entry from
  // the update as we consume it. If we can't find the user, then this is
  // not valid.
  for (const player of sessionData.players) {
    const update = getSessionUser(player.userId, player.isUser);
    if (update === null) {
      throw new Error(`update data has no ${player.isUser ? 'user' : 'guest'} with id ${player.userId}`)
    }

    // Update the player now
    player.isStartingPlayer = update.isStartingPlayer ?? player.isStartingPlayer;
    player.isWinner = update.isWinner ?? player.isWinner;
    player.score = update.score ?? player.score;
  }

  // The list of users and guests in the update must now be 0, or we got more
  // update data than there were players, which we do not support.
  if (updateData.players.users.length !== 0 || updateData.players.guests.length !== 0) {
    throw new Error(`session update data has too many player records to update this session`);
  }

  return sessionData;
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
export async function dbSessionInsert(ctx, sessionData) {
  // Validate that all of the users that are referenced in the session data
  // actually exist; this will patch in the user ID's and also validate the
  // reporter at the same time.
  await validateSessionUsers(ctx, sessionData);

  // Validate that all of the games that are mentioned within the session data
  // are valid and patch their details in.
  await validateGameData(ctx, sessionData);

  // Validate all of the guest players; this happens last because all guests
  // always validate; any missing guests are inserted always.
  await validateSessionGuests(ctx, sessionData);

  // If we get here and the session title is the empty string, then come up with
  // a default that displays the name of the game so that the title makes more
  // sense when viewed.
  if (sessionData.title === '') {
    sessionData.title = `Play of ${sessionData.name}`;
  }

  // Perform the actual insertion of the data, capturing the sessionId of the
  // newly inserted session.
  const sessionId = await insertSessionDetails(ctx, sessionData);

  // Using the sessionId, modify the input structure to look as it would look
  // if someone were to query this session; this allows the person that added
  // to be able to display the result right away if desired.
  return reshapeSessionInput(sessionId, sessionData);
}


/******************************************************************************/


/* Update the session report with the given ID using the update data provided.
 *
 * The update data can only update a subset of the data on an existing session,
 * and does not allow wholesale edits.
 *
 * The return value of this mimics the return for a request on details for this
 * session, including returning null if the session does not exist. Note however
 * that the returned details will be the updated ones. */
export async function dbSessionUpdate(ctx, sessionId, updateData) {
  // Use the provided data to look up the existing session since we need to
  // have the data from it both to validate the input, and to provide the
  // eventual result.
  const sessionData = await dbSessionDetails(ctx, sessionId);
  if (sessionData == null) {
    return null;
  }

  // Validate the incoming update data, and use it to update looked up session
  // data in order to come up with the final version that we use to update the
  // database.
  const newSessionData = prepareSessionUpdate(sessionData, updateData);

  // Iterate over all of the players in the new session data and return back an
  // array of updates to update them.
  const getUserUpdates = () => {
    const updates = [];

    const playerUpdate = ctx.env.DB.prepare(`
      UPDATE SessionReportPlayer
         SET isStartingPlayer = ?3, score = ?4, isWinner = ?5
       WHERE sessionId = ?1 AND userId = ?2
    `);
    const userUpdate = ctx.env.DB.prepare(`
      UPDATE SessionReportPlayer
         SET isStartingPlayer = ?3, score = ?4, isWinner = ?5
       WHERE sessionId = ?1 AND guestId = ?2
    `);

    for (const player of newSessionData.players) {
      const stmt = (player.isUser === true) ? playerUpdate : userUpdate;
      updates.push(stmt.bind(
        newSessionData.sessionId, player.userId,
        int(player.isStartingPlayer), player.score, int(player.isWinner)
      ));
    }

    return updates;
  }

  // Prepare the batch of statements that will perform the update.
  const update = await ctx.env.DB.batch([
    ctx.env.DB.prepare(`
      UPDATE SessionReport
         SET isLearning = ?2, sessionEnd = ?3
       WHERE id = ?1
    `).bind(newSessionData.sessionId, int(newSessionData.isLearning), newSessionData.sessionEnd),

    ctx.env.DB.prepare(`
      UPDATE SessionReportDetails
         SET title = ?2, content = ?3
       WHERE sessionId = ?1
    `).bind(newSessionData.sessionId, newSessionData.title, newSessionData.content),

    ...getUserUpdates()
  ]);
  getDBResult('dbSessionUpdate', 'do_update', update);

  return newSessionData;
}


/******************************************************************************/


/* Get a shortened list of all of the session reports that are currently known
 * to the system, optionally filtering the list to only session reports that
 * record games where the games in the optional gameIdList are the main game or
 * expansions used in a session.
 *
 * The objects returned by this only contain the base information from the main
 * session table, and do not include the players, expansions, or results of the
 * game itself.
 *
 * Each session will contain information on the game to which it applies. */
export async function dbSessionList(ctx, gameIdList, reverse) {
  // Ensure that we got a gameId list input.
  gameIdList ??= [];

  // If we got no flag for reversing, assume no reverse is desired.
  reverse ??= false;

  // Construct the possible sub-query we want to add if any gameId's were
  // provided as filter criteria.
  const filter = JSON.stringify(gameIdList);
  const subQuery = `
   AND A.id IN (
    SELECT DISTINCT id
      FROM SessionReport
     WHERE gameId in (SELECT value from json_each('${filter}'))
    UNION ALL
    SELECT DISTINCT sessionId
      FROM SessionReportExpansions
     WHERE expansionId in (SELECT value from json_each('${filter}'))
       )
  `;

  // Find all of the session reports that exist, OR all of the sessions that
  // mention the games in the provided filter list as either the main game or
  // one of the expansions.
  //
  // The filter only happens when a list of specific gameId's is provided.
  const lookup = await ctx.env.DB.prepare(`
    SELECT A.id,
           C.title,
           A.gameId,
           D.bggId,
           B.name as name,
           A.playType,
           D.slug,
           D.imagePath,
           A.sessionBegin,
           A.sessionEnd,
           A.isLearning
      FROM SessionReport as A, GameName as B, SessionReportDetails as C, Game as D
     WHERE (A.gameId = B.gameId AND B.id = A.gameName)
       AND (D.id = A.gameId)
       AND (A.id = C.sessionId)
       ${(gameIdList.length === 0) ? '' : subQuery}
     ${(reverse === false) ? '' : 'ORDER BY A.sessionBegin DESC'}
  `).all();
  const result = getDBResult('dbSessionList', 'find_session', lookup);

  // In each resulting object, convert all of the boolean fields to proper
  // booleans for the return, and make sure that the image URL is properly
  // mapped so that the page can view the image.
  return result.map(session => {
    session.imagePath = imgGetAssetURL(ctx, session.imagePath, 'thumbnail');
    return mapIntFieldsToBool(session);
  });
}


/******************************************************************************/


/* Get the full details on the game with either the ID or slug provided. The
 * return will be null if there is no such game, otherwise the return is an
 * object that contains the full details on the game, including all of its
 * metadata. */
export async function dbSessionDetails(ctx, sessionId) {
  // Try to find the game with the value has that been provided; we check to see
  // if the provided ID is either a slug or an actual ID.
  const lookup = await ctx.env.DB.prepare(`
    SELECT A.id as sessionId,
           C.title,
           A.gameId,
           D.bggId,
           B.name as name,
           A.playType,
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
  const result = getDBResult('dbSessionDetails', 'find_session', lookup);

  // If there was no result found, then return null back to signal that.
  if (result.length === 0) {
    return null;
  }

  // Our session data is the first (and only) returned object; update any of the
  // boolean fields and add in a mapped version of the image URL that we
  // gathered.
  const sessionData = mapIntFieldsToBool(result[0]);
  sessionData.imagePath = imgGetAssetURL(ctx, sessionData.imagePath, 'smallboxart');

  // Check for the list of expansions that were used to play this game.
  const expansionLookup = await ctx.env.DB.prepare(`
    SELECT A.expansionId as gameId, C.bggId, B.name as name, C.slug, C.imagePath
      FROM SessionReportExpansions as A, GameName as B, Game as C
     WHERE A.sessionId = ?1
       AND (A.expansionId = B.gameId AND B.id = A.expansionName)
       AND (A.expansionId = C.id);
  `).bind(sessionId).all();
  const expansions = getDBResult('dbSessionDetails', 'find_expansions', expansionLookup);

  // Check for the list of players that participated in this session.
  const playerLookup = await ctx.env.DB.prepare(`
    SELECT 1 as isUser, A.userId, B.displayName as name, A.isReporter, A.isStartingPlayer, A.score, A.isWinner
      FROM SessionReportPlayer as A, User as B
     WHERE sessionId = ?1
       AND guestId is NULL
       AND A.userId = B.id
    UNION ALL
    SELECT 0 as isUser, b.id as userId, B.displayName as name, A.isReporter, A.isStartingPlayer, A.score, A.isWinner
      FROM SessionReportPlayer as A, GuestUser as B
     WHERE sessionId = ?1
       AND guestId IS NOT NULL
       AND A.guestId = B.id;
  `).bind(sessionId).all();

  // Get the players out of the result and convert any boolean values that
  // appear in either of them.
  const players = getDBResult('dbSessionDetails', 'find_players', playerLookup);
  players.forEach(player => mapIntFieldsToBool(player));

  // Map the found expansions and players in; for expansions we need to get the
  // thumbnail for the expansion that was used.
  sessionData.expansions = imgMapAssetListURLs(ctx, expansions, 'imagePath', 'thumbnail');
  sessionData.players = players;

  return sessionData;
}


/******************************************************************************/
