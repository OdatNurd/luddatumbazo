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
 * reference users in the system are valid.
 *
 * This will find the distinct list of users and verify that they all exist,
 * patching the data found into the session data player user list within the
 * object itself.
 *
 * The reporter is stored on the session itself and does not have to be a
 * player, so it is validated by the insert's foreign key rather than here.
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
    user.isReporter = (user.userId === sessionData.loggingPlayerId);
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

  // Add the state that the details response always carries. The creator is the
  // reporter, so can always edit the report they just made.
  sessionData.isOpen = sessionData.sessionEnd === null;
  sessionData.canEdit = true;

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
      INSERT INTO SessionReport
        (gameId, gameName, playType, loggingPlayerId, sessionBegin, sessionEnd, isLearning)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    `).bind(session.gameId, session.nameId, session.playType, session.loggingPlayerId,
            session.sessionBegin, session.sessionEnd, int(session.isLearning)),

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
  // Only fields that were actually provided are changed. In particular, a null
  // sessionEnd is an explicit request to reopen the session, so it must be
  // distinguished from a missing sessionEnd.
  if (updateData.isLearning !== undefined) {
    sessionData.isLearning = updateData.isLearning;
  }
  if (updateData.sessionEnd !== undefined) {
    sessionData.sessionEnd = updateData.sessionEnd;
  }
  if (updateData.title !== undefined) {
    sessionData.title = updateData.title;
  }
  if (updateData.content !== undefined) {
    sessionData.content = updateData.content;
  }

  // If the update doesn't contain any player data, there's nothing else to
  // update so short circuit the return now.
  if (updateData.players === undefined) {
    return sessionData;
  }

  // Results are matched by the stable SessionReportPlayer row id, not the user
  // or guest id. That keeps them unambiguous even if a roster ever contains a
  // user and a guest with the same numeric id.
  const playersById = new Map(sessionData.players.map(player => [player.playerId, player]));
  const seen = new Set();

  for (const update of updateData.players) {
    if (seen.has(update.playerId) === true) {
      throw new Error(`duplicate update for player ${update.playerId}`);
    }
    seen.add(update.playerId);

    const player = playersById.get(update.playerId);
    if (player === undefined) {
      throw new Error(`session has no player ${update.playerId}`);
    }

    if (update.isStartingPlayer !== undefined) {
      player.isStartingPlayer = update.isStartingPlayer;
    }
    if (update.score !== undefined) {
      player.score = update.score;
    }
    if (update.isWinner !== undefined) {
      player.isWinner = update.isWinner;
    }
  }

  return sessionData;
}


/******************************************************************************/


/* Gather the static list of known game types that can be used to represent a
 * game in a session report.
 *
 * The result is a list of records providing the name, slug and id of all of the
 * known game types, along with the name of the bootstrap icon used to represent
 * them in lists. */
export async function dbSessionGameTypes(ctx) {
  const result = await ctx.env.DB.prepare(`
    select * FROM SessionGameType
  `).all();

  return getDBResult('dbSessionGameTypes', 'get_gametypes', result);
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
export async function dbSessionUpdate(ctx, sessionId, updateData, actorId) {
  // Use the provided data to look up the existing session since we need to
  // have the data from it both to validate the input, and to provide the
  // eventual result.
  const sessionData = await dbSessionDetails(ctx, sessionId, actorId);
  if (sessionData == null) {
    return null;
  }

  // Validate the incoming update data, and use it to update looked up session
  // data in order to come up with the final version that we use to update the
  // database.
  const newSessionData = prepareSessionUpdate(sessionData, updateData);

  // Iterate over all of the players in the new session data and return back an
  // array of updates to update them. The player row id is stable and unique
  // within the session, so it identifies the row without guessing whether the
  // player is stored in the user or guest slot.
  const getPlayerUpdates = () => {
    const playerUpdate = ctx.env.DB.prepare(`
      UPDATE SessionReportPlayer
         SET isStartingPlayer = ?3, score = ?4, isWinner = ?5
       WHERE sessionId = ?1 AND id = ?2
    `);

    return newSessionData.players.map(player => playerUpdate.bind(
      newSessionData.sessionId, player.playerId,
      int(player.isStartingPlayer), player.score, int(player.isWinner)
    ));
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

    ...getPlayerUpdates()
  ]);
  getDBResult('dbSessionUpdate', 'do_update', update);

  // Reload after the write so the response reflects the final state (including
  // whether this user can still edit, which changes when they close an open
  // session they do not own).
  return dbSessionDetails(ctx, sessionId, actorId);
}


/******************************************************************************/


/* Get the counts used by the profile menu and open-session view.
 *
 * A household session is a distinct report in which at least one player is a
 * user who belongs to any household the current user belongs to. The reporter
 * is intentionally not part of that rule: a user who filed a report without
 * playing in it did not take part in the session. Guest rows cannot join
 * UserHousehold, so guest-only sessions are not household sessions. */
export async function dbSessionStatus(ctx, userId) {
  const lookup = await ctx.env.DB.prepare(`
    WITH household_sessions AS (
      SELECT DISTINCT report.id, report.sessionEnd
        FROM SessionReport AS report
        JOIN SessionReportPlayer AS player
          ON player.sessionId = report.id
        JOIN UserHousehold AS membership
          ON membership.userId = player.userId
       WHERE membership.householdId IN (
               SELECT householdId
                 FROM UserHousehold
                WHERE userId = ?1
             )
    )
    SELECT
      (SELECT COUNT(*) FROM SessionReport) AS total,
      (SELECT COUNT(*) FROM SessionReport WHERE sessionEnd IS NULL) AS open,
      (SELECT COUNT(*) FROM household_sessions) AS householdSessions,
      (SELECT COUNT(*) FROM household_sessions WHERE sessionEnd IS NULL) AS householdOpen
  `).bind(userId).all();
  const result = getDBResult('dbSessionStatus', 'count_sessions', lookup);
  const counts = result[0] ?? {};

  return {
    total: Number(counts.total ?? 0),
    open: Number(counts.open ?? 0),
    householdSessions: Number(counts.householdSessions ?? 0),
    householdOpen: Number(counts.householdOpen ?? 0)
  };
}


/******************************************************************************/


/* Get a shortened list of all of the session reports that are currently known
 * to the system, optionally filtering the list to only session reports that
 * record games where the games in the optional gameIdList are the main game or
 * expansions used in a session.
 *
 * The objects returned by this contain the base information from the main
 * session table plus a compact player summary; they do not include expansions
 * or results.
 *
 * Each session will contain information on the game to which it applies. */
export async function dbSessionList(ctx, options = {}, legacyReverse = false) {
  // Keep the old positional signature working for any caller that has not yet
  // moved to the options object.
  if (Array.isArray(options) === true) {
    options = { gameIds: options, reverse: legacyReverse };
  }

  const {
    gameIds: gameIdList = [],
    reverse = false,
    status = undefined,
    players = { keys: [], users: [], guests: [] },
    match = 'all',
    household = undefined,
    from = undefined,
    to = undefined,
    playType = undefined,
    learning = undefined,
    userId = undefined
  } = options;

  // The schema returns the player filter in both canonical-key and id-array
  // form; accepting a plain key array as well keeps this helper easy to call
  // directly from tests and future internal callers.
  const selectedKeys = [...new Set(Array.isArray(players) ? players : (players?.keys ?? []))];
  const selectedUsers = [...new Set(selectedKeys
    .filter(key => key.startsWith('u:'))
    .map(key => Number(key.slice(2))))];
  const selectedGuests = [...new Set(selectedKeys
    .filter(key => key.startsWith('g:'))
    .map(key => Number(key.slice(2))))];
  const actorId = userId ?? null;

  // The dynamic fragments below are all static SQL; every value is bound. The
  // household expression in the SELECT comes first so its parameter is bound
  // before the WHERE parameters.
  const where = [];
  const whereParams = [];

  // Only add a game clause when the caller actually asked for one.
  if (gameIdList.length > 0) {
    const filter = JSON.stringify(gameIdList);

    where.push(`
   AND A.id IN (
    SELECT DISTINCT id
      FROM SessionReport
     WHERE gameId IN (SELECT value FROM json_each(?))
    UNION ALL
    SELECT DISTINCT sessionId
      FROM SessionReportExpansions
     WHERE expansionId IN (SELECT value FROM json_each(?))
       )
    `);
    whereParams.push(filter, filter);
  }

  // A non-null end is the same definition of closed used by the details
  // response.
  if (status === 'open') {
    where.push('AND A.sessionEnd IS NULL');
  }
  else if (status === 'closed') {
    where.push('AND A.sessionEnd IS NOT NULL');
  }

  // Player matching is an identity filter: a user row and a guest row remain
  // distinct even when both display the same name. `all` counts distinct
  // selected identities rather than the number of player rows.
  if (selectedKeys.length > 0) {
    const usersJson = JSON.stringify(selectedUsers);
    const guestsJson = JSON.stringify(selectedGuests);
    const playerMatch = `
      (
        (FP.userId IS NOT NULL AND FP.userId IN (SELECT value FROM json_each(?)))
        OR
        (FP.guestId IS NOT NULL AND FP.guestId IN (SELECT value FROM json_each(?)))
      )`;

    if (match === 'all') {
      where.push(`AND (
        SELECT COUNT(DISTINCT CASE
                 WHEN FP.userId IS NOT NULL THEN 'u:' || FP.userId
                 ELSE 'g:' || FP.guestId
               END)
          FROM SessionReportPlayer AS FP
         WHERE FP.sessionId = A.id
           AND ${playerMatch}
      ) = ?`);
      whereParams.push(usersJson, guestsJson, selectedKeys.length);
    }
    else {
      where.push(`AND EXISTS (
        SELECT 1
          FROM SessionReportPlayer AS FP
         WHERE FP.sessionId = A.id
           AND ${playerMatch}
      )`);
      whereParams.push(usersJson, guestsJson);
    }
  }

  // Household filtering is personalization, not authorization. It follows the
  // same rule as the status counts: a session has a household when at least one
  // player is a user in any household the actor belongs to.
  if (household === 'me') {
    where.push(`AND EXISTS (
      SELECT 1
        FROM SessionReportPlayer AS HP
        JOIN UserHousehold AS HM ON HM.userId = HP.userId
       WHERE HP.sessionId = A.id
         AND HM.householdId IN (
           SELECT householdId
             FROM UserHousehold
            WHERE userId = ?
         )
    )`);
    whereParams.push(actorId);
  }

  // The API accepts instants; the client computes local start/end of day.
  if (from !== undefined) {
    where.push('AND datetime(A.sessionBegin) >= datetime(?)');
    whereParams.push(from);
  }
  if (to !== undefined) {
    where.push('AND datetime(A.sessionBegin) <= datetime(?)');
    whereParams.push(to);
  }
  if (playType !== undefined) {
    where.push('AND A.playType = ?');
    whereParams.push(playType);
  }
  if (learning !== undefined) {
    where.push('AND A.isLearning = ?');
    whereParams.push(learning === true ? 1 : 0);
  }

  // `reverse` keeps its existing meaning for the date direction; the
  // household/open grouping is deterministic either way. The id tiebreaker
  // makes equal start times stable across requests. Game-scoped lists (the
  // inline session list on a game page) keep their chronological order instead
  // of being regrouped by household.
  const dateDirection = (reverse === true) ? 'DESC' : 'ASC';
  const order = (gameIdList.length > 0)
    ? `A.sessionBegin ${dateDirection}, A.id ${dateDirection}`
    : `isHousehold DESC, isOpen DESC, A.sessionBegin ${dateDirection}, A.id ${dateDirection}`;

  // Find all of the session reports that exist, OR all of the sessions that
  // match the requested filters. The household expression is repeated in the
  // order clause through the alias below rather than joined into the main
  // query, which would multiply rows.
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
           EXISTS (
             SELECT 1
               FROM SessionReportPlayer AS HP
               JOIN UserHousehold AS HM ON HM.userId = HP.userId
              WHERE HP.sessionId = A.id
                AND HM.householdId IN (
                  SELECT householdId
                    FROM UserHousehold
                   WHERE userId = ?
                )
           ) AS isHousehold,
           A.sessionEnd IS NULL AS isOpen,
           A.isLearning
      FROM SessionReport as A, GameName as B, SessionReportDetails as C, Game as D
     WHERE (A.gameId = B.gameId AND B.id = A.gameName)
       AND (D.id = A.gameId)
       AND (A.id = C.sessionId)
       ${where.join('\n')}
     ORDER BY ${order}
  `).bind(actorId, ...whereParams).all();
  const result = getDBResult('dbSessionList', 'find_session', lookup);

  // Gather the players for all of the returned sessions in one query. The
  // list is used by the open-session cards and is intentionally compact; the
  // full player records (scores, flags and stable row IDs) stay on details.
  const playerRows = new Map();
  if (result.length > 0) {
    const playerLookup = await ctx.env.DB.prepare(`
      SELECT A.sessionId,
             A.userId,
             A.guestId,
             COALESCE(U.displayName, G.displayName) AS name
        FROM SessionReportPlayer AS A
        LEFT JOIN User AS U ON U.id = A.userId
        LEFT JOIN GuestUser AS G ON G.id = A.guestId
       WHERE A.sessionId IN (SELECT value FROM json_each(?1))
       ORDER BY A.sessionId, A.isReporter DESC, A.id
    `).bind(JSON.stringify(result.map(session => session.id))).all();

    for (const player of getDBResult('dbSessionList', 'find_players', playerLookup)) {
      const entries = playerRows.get(player.sessionId) ?? [];
      entries.push({
        key: (player.userId !== null) ? `u:${player.userId}` : `g:${player.guestId}`,
        name: player.name,
        isUser: player.userId !== null
      });
      playerRows.set(player.sessionId, entries);
    }
  }

  // In each resulting object, convert all of the boolean fields to proper
  // booleans for the return, make sure that the image URL is properly mapped
  // so that the page can view the image, and attach the compact player list.
  return result.map(session => {
    session.imagePath = imgGetAssetURL(ctx, session.imagePath, 'thumbnail');
    session.players = playerRows.get(session.id) ?? [];

    // The compact roster is also exposed as a searchable text field so every
    // session list (including the inline game-page one) can find people without
    // knowing about the players array shape.
    session.playerNames = session.players
      .map(player => player.name)
      .filter(name => name !== null && name !== undefined && name !== '')
      .join(', ');

    return mapIntFieldsToBool(session);
  });
}


/******************************************************************************/


/* Get the full details on the game with either the ID or slug provided. The
 * return will be null if there is no such game, otherwise the return is an
 * object that contains the full details on the game, including all of its
 * metadata. */
export async function dbSessionDetails(ctx, sessionId, actorId) {
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
           A.loggingPlayerId,
           R.displayName as reporterName,
           A.sessionBegin,
           A.sessionEnd,
           A.isLearning,
           C.content
      FROM SessionReport as A, GameName as B, SessionReportDetails as C, Game as D
      LEFT JOIN User as R ON R.id = A.loggingPlayerId
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
    SELECT 1 as isUser, A.id as playerId, A.userId, B.displayName as name,
           A.isReporter, A.isStartingPlayer, A.score, A.isWinner
      FROM SessionReportPlayer as A, User as B
     WHERE sessionId = ?1
       AND guestId is NULL
       AND A.userId = B.id
    UNION ALL
    SELECT 0 as isUser, A.id as playerId, B.id as userId, B.displayName as name,
           A.isReporter, A.isStartingPlayer, A.score, A.isWinner
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

  // Report the open state and whether the current user may edit this report.
  // An open session can be edited by any user who is a player; a closed one
  // only by its reporter. Guests can never authenticate, so are not eligible.
  sessionData.isOpen = sessionData.sessionEnd === null;
  const actor = Number(actorId);
  sessionData.canEdit = Number.isInteger(actor) && (
    Number(sessionData.loggingPlayerId) === actor ||
    (sessionData.isOpen === true && players.some(player =>
      player.isUser === true && Number(player.userId) === actor
    ))
  );

  return sessionData;
}


/******************************************************************************/
