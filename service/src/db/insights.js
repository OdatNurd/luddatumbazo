/******************************************************************************/


import { getDBResult } from '#db/common';


/******************************************************************************/


/* Round a ratio to the two decimal places the API promises, or null when there
 * is no denominator. A missing percentage is deliberately not zero: the UI
 * shows an em dash and the reason rather than claiming a 0% record. */
const pct = (part, whole) => whole > 0
  ? Math.round((part / whole) * 10000) / 100
  : null;

const round1 = value => value === null || value === undefined
  ? null
  : Math.round(value * 10) / 10;


/******************************************************************************/


/* Build the session-level WHERE clause shared by every statement in a report.
 * Every fragment is static SQL and every value is bound. `learning` is 0/1 when
 * the report has a learning-session preference, which lets the same builder
 * count the sessions that were excluded. */
function buildSessionWhere(options) {
  const {
    learning = undefined,
    from = undefined,
    to = undefined,
    playType = undefined,
    gameId = undefined,
    players = { users: [], guests: [] }
  } = options;

  const clauses = [];
  const params = [];

  if (learning !== undefined) {
    clauses.push('s.isLearning = ?');
    params.push(learning ? 1 : 0);
  }

  if (from !== undefined) {
    clauses.push('datetime(s.sessionBegin) >= datetime(?)');
    params.push(from);
  }

  if (to !== undefined) {
    clauses.push('datetime(s.sessionBegin) <= datetime(?)');
    params.push(to);
  }

  if (playType !== undefined) {
    clauses.push('s.playType = ?');
    params.push(playType);
  }

  if (gameId !== undefined) {
    clauses.push('s.gameId = ?');
    params.push(gameId);
  }

  if (players.users.length !== 0 || players.guests.length !== 0) {
    clauses.push(`EXISTS (
      SELECT 1
        FROM SessionReportPlayer AS p
       WHERE p.sessionId = s.id
         AND (
           (p.userId IS NOT NULL AND p.userId IN (SELECT value FROM json_each(?)))
           OR
           (p.guestId IS NOT NULL AND p.guestId IN (SELECT value FROM json_each(?)))
         )
    )`);
    params.push(JSON.stringify(players.users), JSON.stringify(players.guests));
  }

  return {
    where: clauses.length === 0 ? '1 = 1' : clauses.join('\n   AND '),
    params
  };
}


/******************************************************************************/


/* The scoped and flags CTEs every aggregate reads. The scoped CTE applies the
 * report filters once; the flags CTE turns each session's player rows into the
 * handful of booleans the aggregates need (multiplayer, decided, starter, and
 * whether the starter won). */
function buildScopedCte(options) {
  // Excluding learning keeps only non-learning sessions; including it removes
  // the flag clause entirely rather than selecting learning sessions alone.
  const { where, params } = buildSessionWhere({
    ...options,
    learning: options.includeLearning === true ? undefined : 0
  });

  return {
    params,
    sql: `
      WITH scoped AS (
        SELECT s.id,
               s.gameId,
               s.sessionBegin,
               s.sessionEnd,
               CASE
                 WHEN s.sessionEnd IS NOT NULL
                  AND julianday(s.sessionEnd) > julianday(s.sessionBegin)
                 THEN (julianday(s.sessionEnd) - julianday(s.sessionBegin)) * 1440
               END AS minutes
          FROM SessionReport AS s
         WHERE ${where}
      ),
      flags AS (
        SELECT sc.id,
               sc.gameId,
               sc.sessionBegin,
               sc.sessionEnd,
               sc.minutes,
               COUNT(p.id) AS playerCount,
               MAX(CASE WHEN p.isWinner = 1 THEN 1 ELSE 0 END) AS hasWinner,
               MAX(CASE WHEN p.isStartingPlayer = 1 THEN 1 ELSE 0 END) AS hasStarter,
               MAX(CASE WHEN p.isStartingPlayer = 1 AND p.isWinner = 1
                        THEN 1 ELSE 0 END) AS starterWon
          FROM scoped AS sc
          LEFT JOIN SessionReportPlayer AS p ON p.sessionId = sc.id
         GROUP BY sc.id
      )`
  };
}


/******************************************************************************/


/* Player-key helpers for the person predicate in the per-player aggregate. */
function playerPredicate(players) {
  if (players.users.length === 0 && players.guests.length === 0) {
    return { sql: '', params: [] };
  }

  return {
    sql: `WHERE (p.userId IN (SELECT value FROM json_each(?))
             OR p.guestId IN (SELECT value FROM json_each(?)))`,
    params: [JSON.stringify(players.users), JSON.stringify(players.guests)]
  };
}


/******************************************************************************/


/* Aggregate a Player Stats report from the session history.
 *
 * The report is computed on demand from a small number of indexed queries; no
 * session rows are returned and nothing is cached or materialized. When people
 * are selected the universe is every session that includes at least one of
 * them; each person's own metrics are then read from that person's rows, so a
 * session where only one of the selected people played still counts for them.
 *
 * `options`:
 *   players          PlayerFilterSchema output ({keys, users, guests})
 *   gameId           optional resolved numeric game id
 *   from, to         optional ISO instants, inclusive
 *   playType         optional session play type
 *   includeLearning  default false
 */
export async function dbPlayerStats(ctx, options = {}) {
  const {
    players = { keys: [], users: [], guests: [] },
    gameId = undefined,
    from = undefined,
    to = undefined,
    playType = undefined,
    includeLearning = false
  } = options;

  const scoped = buildScopedCte({
    includeLearning,
    from,
    to,
    playType,
    gameId,
    players
  });

  const group = ctx.env.DB.prepare(`
    ${scoped.sql}
    SELECT COUNT(*) AS sessions,
           SUM(CASE WHEN playerCount >= 2 THEN 1 ELSE 0 END) AS multiplayerSessions,
           SUM(CASE WHEN playerCount >= 2 AND hasWinner = 1 THEN 1 ELSE 0 END) AS decidedSessions,
           SUM(CASE WHEN playerCount = 1 THEN 1 ELSE 0 END) AS soloSessions,
           SUM(CASE WHEN playerCount >= 2 AND hasWinner = 1 AND hasStarter = 1
                    THEN 1 ELSE 0 END) AS seatSessions,
           SUM(CASE WHEN playerCount >= 2 AND hasWinner = 1 AND hasStarter = 1
                     AND starterWon = 1 THEN 1 ELSE 0 END) AS seatWins,
           SUM(CASE WHEN playerCount > 0 AND hasStarter = 0 THEN 1 ELSE 0 END) AS missingStarters,
           SUM(CASE WHEN sessionEnd IS NOT NULL AND minutes IS NULL
                    THEN 1 ELSE 0 END) AS invalidDurations,
           MIN(minutes) AS minMinutes,
           AVG(minutes) AS avgMinutes,
           MAX(minutes) AS maxMinutes,
           SUM(playerCount) AS appearances
      FROM flags
  `).bind(...scoped.params);

  const predicate = playerPredicate(players);
  const playerRows = ctx.env.DB.prepare(`
    ${scoped.sql}
    SELECT p.userId,
           p.guestId,
           COALESCE(u.displayName, gu.displayName) AS name,
           COUNT(*) AS plays,
           SUM(CASE WHEN f.playerCount >= 2 AND f.hasWinner = 1
                    THEN 1 ELSE 0 END) AS decided,
           SUM(CASE WHEN f.playerCount >= 2 AND f.hasWinner = 1
                     AND p.isWinner = 1 THEN 1 ELSE 0 END) AS wins,
           SUM(CASE WHEN f.playerCount >= 2 AND f.hasWinner = 1
                     AND f.hasStarter = 1 AND p.isStartingPlayer = 1
                    THEN 1 ELSE 0 END) AS starts,
           SUM(CASE WHEN f.playerCount >= 2 AND f.hasWinner = 1
                     AND f.hasStarter = 1 AND p.isStartingPlayer = 1
                     AND p.isWinner = 1 THEN 1 ELSE 0 END) AS starterWins,
           SUM(CASE WHEN f.playerCount >= 2 AND f.hasWinner = 1
                     AND f.hasStarter = 1 AND p.isStartingPlayer = 0
                    THEN 1 ELSE 0 END) AS nonStarts,
           SUM(CASE WHEN f.playerCount >= 2 AND f.hasWinner = 1
                     AND f.hasStarter = 1 AND p.isStartingPlayer = 0
                     AND p.isWinner = 1 THEN 1 ELSE 0 END) AS nonStarterWins,
           MAX(f.sessionBegin) AS lastPlayed
      FROM flags AS f
      JOIN SessionReportPlayer AS p ON p.sessionId = f.id
      LEFT JOIN User AS u ON u.id = p.userId
      LEFT JOIN GuestUser AS gu ON gu.id = p.guestId
      ${predicate.sql}
     GROUP BY p.userId, p.guestId
     ORDER BY plays DESC, wins DESC, name COLLATE NOCASE
     LIMIT 100
  `).bind(...scoped.params, ...predicate.params);

  const games = gameId !== undefined
    ? null
    : ctx.env.DB.prepare(`
        ${scoped.sql}
        SELECT f.gameId,
               g.slug,
               gn.name,
               COUNT(*) AS plays,
               (SELECT COUNT(DISTINCT CASE
                         WHEN p.userId IS NOT NULL THEN 'u:' || p.userId
                         WHEN p.guestId IS NOT NULL THEN 'g:' || p.guestId
                       END)
                  FROM SessionReportPlayer AS p
                  JOIN flags AS pf ON pf.id = p.sessionId
                 WHERE pf.gameId = f.gameId) AS distinctPlayers,
               AVG(f.minutes) AS avgMinutes,
               MAX(f.sessionBegin) AS lastPlayed
          FROM flags AS f
          JOIN Game AS g ON g.id = f.gameId
          JOIN GameName AS gn ON gn.gameId = g.id AND gn.isPrimary = 1
         GROUP BY f.gameId
         ORDER BY plays DESC, lastPlayed DESC
         LIMIT 10
      `).bind(...scoped.params);

  const learningFilters = buildSessionWhere({
    learning: 1,
    from,
    to,
    playType,
    gameId,
    players
  });

  const learning = includeLearning
    ? null
    : ctx.env.DB.prepare(`
        SELECT COUNT(*) AS count
          FROM SessionReport AS s
         WHERE ${learningFilters.where}
      `).bind(...learningFilters.params);

  const statements = [group, playerRows];
  if (games !== null) {
    statements.push(games);
  }
  if (learning !== null) {
    statements.push(learning);
  }

  const results = await ctx.env.DB.batch(statements);
  const groupRow = getDBResult('dbPlayerStats', 'group', results[0])[0] ?? {};
  const playerData = getDBResult('dbPlayerStats', 'players', results[1]);
  const gamesData = games !== null
    ? getDBResult('dbPlayerStats', 'games', results[2])
    : [];
  const learningExcluded = learning !== null
    ? Number(getDBResult('dbPlayerStats', 'learning', results.at(-1))[0]?.count ?? 0)
    : 0;

  const groupSessions = Number(groupRow.sessions ?? 0);
  const multiplayerSessions = Number(groupRow.multiplayerSessions ?? 0);
  const decidedSessions = Number(groupRow.decidedSessions ?? 0);
  const soloSessions = Number(groupRow.soloSessions ?? 0);
  const seatSessions = Number(groupRow.seatSessions ?? 0);
  const seatWins = Number(groupRow.seatWins ?? 0);
  const missingStarters = Number(groupRow.missingStarters ?? 0);
  const invalidDurations = Number(groupRow.invalidDurations ?? 0);

  const people = playerData.map(row => {
    const decided = Number(row.decided ?? 0);
    const wins = Number(row.wins ?? 0);
    const starts = Number(row.starts ?? 0);
    const starterWins = Number(row.starterWins ?? 0);
    const nonStarts = Number(row.nonStarts ?? 0);
    const nonStarterWins = Number(row.nonStarterWins ?? 0);
    const plays = Number(row.plays ?? 0);

    return {
      key: row.userId !== null ? `u:${row.userId}` : `g:${row.guestId}`,
      userId: row.userId,
      guestId: row.guestId,
      name: row.name ?? null,
      plays,
      decided,
      wins,
      losses: decided - wins,
      winPct: pct(wins, decided),
      starts,
      starterWins,
      starterWinPct: pct(starterWins, starts),
      nonStarts,
      nonStarterWins,
      nonStarterWinPct: pct(nonStarterWins, nonStarts),
      sharePct: pct(plays, groupSessions),
      lastPlayed: row.lastPlayed ?? null
    };
  });

  const appearances = players.keys.length > 0
    ? people.reduce((total, person) => total + person.plays, 0)
    : Number(groupRow.appearances ?? 0);

  const warnings = [
    { code: 'undecided-sessions', count: multiplayerSessions - decidedSessions },
    { code: 'solo-sessions', count: soloSessions },
    { code: 'missing-starters', count: missingStarters },
    { code: 'invalid-durations', count: invalidDurations },
    { code: 'learning-excluded', count: learningExcluded }
  ].filter(warning => warning.count > 0);

  return {
    group: {
      sessions: groupSessions,
      appearances,
      multiplayerSessions,
      decidedSessions,
      undecidedSessions: multiplayerSessions - decidedSessions,
      soloSessions,
      seatSessions,
      seatWins,
      seatWinPct: pct(seatWins, seatSessions),
      minDurationMinutes: round1(groupRow.minMinutes),
      avgDurationMinutes: round1(groupRow.avgMinutes),
      maxDurationMinutes: round1(groupRow.maxMinutes),
      invalidDurations,
      learningExcluded
    },
    players: people,
    games: gamesData.map(game => ({
      gameId: game.gameId,
      slug: game.slug,
      name: game.name,
      plays: Number(game.plays ?? 0),
      distinctPlayers: Number(game.distinctPlayers ?? 0),
      avgDurationMinutes: round1(game.avgMinutes),
      lastPlayed: game.lastPlayed ?? null
    })),
    warnings
  };
}


/******************************************************************************/
