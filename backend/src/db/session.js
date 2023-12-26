/******************************************************************************/


import { mapImageAssets, getImageAssetURL, mapIntFieldsToBool, getDBResult } from './common.js';


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
