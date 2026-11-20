/******************************************************************************/


import { getDBResult } from '#db/common';

import { imgGetAssetURL } from '#lib/image';


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


/* The household whose collection the picker draws from. The application has a
 * notion of a primary household per user; the lowest id breaks ties for legacy
 * rows that predate the primary flag. Returns null when the user has none. */
export async function dbUserPrimaryHousehold(ctx, userId) {
  const result = await ctx.env.DB.prepare(`
    SELECT householdId
      FROM UserHousehold
     WHERE userId = ?
     ORDER BY isPrimary DESC, householdId
     LIMIT 1
  `).bind(userId).all();

  return getDBResult('dbUserPrimaryHousehold', 'find_household', result)[0]?.householdId ?? null;
}


/******************************************************************************/


/* Draw a game from the household's owned shelf using the picker filter.
 *
 * The query returns matches in random order, so the first row is a uniform draw
 * from the pool; the response then sorts the same rows for the "also in the
 * running" list. Only owned base games are eligible: a game that appears as an
 * expansion is excluded unless it also appears as a base somewhere. Expansion
 * links are checked by local id and BGG id because most imported rows carry
 * only the BGG side of the relationship.
 *
 * History counts a game as played when any selected person appears in a session
 * of that base game since the requested date. Learning sessions count: learning
 * a game is still playing it. */
export async function dbPickerSearch(ctx, options = {}) {
  const { householdId = null, filter, excludeGameId = undefined } = options;

  if (householdId === null) {
    return { picked: null, matches: [], total: 0, onlyMatch: false, warnings: [] };
  }

  const where = [
    'EXISTS (SELECT 1 FROM GameOwners AS o WHERE o.gameId = g.id AND o.householdId = ?)'
  ];
  const params = [householdId];

  // Pure expansions are not pickable. A game that is both an expansion and a
  // base game stays eligible.
  where.push(`NOT (
    EXISTS (
      SELECT 1
        FROM GameExpansion AS e
       WHERE e.expansionGameId = g.id
          OR (g.bggId > 0 AND e.expansionGameBggId = g.bggId)
    )
    AND NOT EXISTS (
      SELECT 1
        FROM GameExpansion AS b
       WHERE b.baseGameId = g.id
          OR (g.bggId > 0 AND b.baseGameBggId = g.bggId)
    )
  )`);

  const players = filter.players ?? {};
  if (players.min !== undefined) {
    where.push('g.maxPlayers >= ?');
    params.push(players.min);
  }
  if (players.max !== undefined) {
    where.push('g.minPlayers <= ?');
    params.push(players.max);
  }

  const time = filter.time ?? {};
  if (time.min !== undefined) {
    where.push('g.maxPlaytime >= ?');
    params.push(time.min);
  }
  if (time.max !== undefined) {
    where.push('g.minPlaytime <= ?');
    params.push(time.max);
  }

  const complexity = filter.complexity ?? {};
  if (complexity.min !== undefined) {
    where.push('g.complexity >= ?');
    params.push(complexity.min);
  }
  if (complexity.max !== undefined) {
    where.push('g.complexity <= ?');
    params.push(complexity.max);
  }

  const categories = filter.categories ?? [];
  if (categories.length > 0) {
    where.push(`EXISTS (
      SELECT 1
        FROM GameMetadataPlacement AS mp
        JOIN GameMetadata AS m ON m.id = mp.itemId
       WHERE mp.gameId = g.id
         AND mp.metatype = 'category'
         AND m.id IN (SELECT value FROM json_each(?))
    )`);
    params.push(JSON.stringify(categories));
  }

  const mechanics = filter.mechanics ?? [];
  if (mechanics.length > 0) {
    where.push(`EXISTS (
      SELECT 1
        FROM GameMetadataPlacement AS mp
        JOIN GameMetadata AS m ON m.id = mp.itemId
       WHERE mp.gameId = g.id
         AND mp.metatype = 'mechanic'
         AND m.id IN (SELECT value FROM json_each(?))
    )`);
    params.push(JSON.stringify(mechanics));
  }

  const history = filter.history ?? { enabled: false, players: [], mode: 'exclude' };
  if (history.enabled === true && history.players.length > 0) {
    const users = history.players
      .filter(key => key.startsWith('u:'))
      .map(key => Number(key.slice(2)));
    const guests = history.players
      .filter(key => key.startsWith('g:'))
      .map(key => Number(key.slice(2)));

    where.push(`${history.mode === 'include' ? 'EXISTS' : 'NOT EXISTS'} (
      SELECT 1
        FROM SessionReport AS s
       WHERE s.gameId = g.id
         AND datetime(s.sessionBegin) >= datetime(?)
         AND EXISTS (
           SELECT 1
             FROM SessionReportPlayer AS p
            WHERE p.sessionId = s.id
              AND (
                (p.userId IS NOT NULL AND p.userId IN (SELECT value FROM json_each(?)))
                OR
                (p.guestId IS NOT NULL AND p.guestId IN (SELECT value FROM json_each(?)))
              )
         )
    )`);
    // Stored history dates are calendar days in UTC. With no date, the plan's
    // default is one year back.
    const from = history.from ??
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    params.push(
      `${from}T00:00:00Z`,
      JSON.stringify(users),
      JSON.stringify(guests)
    );
  }

  const lookup = await ctx.env.DB.prepare(`
    SELECT g.id,
           g.slug,
           g.bggId,
           gn.name,
           g.minPlayers,
           g.maxPlayers,
           g.minPlaytime,
           g.maxPlaytime,
           g.complexity,
           g.imagePath
      FROM Game AS g
      JOIN GameName AS gn ON gn.gameId = g.id AND gn.isPrimary = 1
     WHERE ${where.join(' AND ')}
     ORDER BY RANDOM()
     LIMIT 500
  `).bind(...params).all();

  const rows = getDBResult('dbPickerSearch', 'find_games', lookup);
  const games = rows.map(game => ({
    id: game.id,
    slug: game.slug,
    name: game.name,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    minPlaytime: game.minPlaytime,
    maxPlaytime: game.maxPlaytime,
    complexity: game.complexity,
    imagePath: imgGetAssetURL(ctx, game.imagePath, 'boxart'),
    imageFullPath: imgGetAssetURL(ctx, game.imagePath, 'full')
  }));

  let picked = null;
  if (excludeGameId === undefined) {
    picked = games[0] ?? null;
  }
  else {
    picked = games.find(game => game.id !== excludeGameId) ?? games[0] ?? null;
  }

  const matches = [...games].sort((left, right) => left.name.localeCompare(right.name));

  return {
    picked,
    matches,
    total: games.length,
    onlyMatch: games.length === 1,
    warnings: []
  };
}


/******************************************************************************/


/* A saved filter's JSON is validated when written, but a row may outlive a
 * schema change or be edited by hand. A broken row must not take down the
 * list; it is returned with a null filter so the UI can still offer delete. */
const mapPickerFilter = row => {
  let filter = null;

  try {
    filter = JSON.parse(row.filterJson);
  }
  catch {
    filter = null;
  }

  return {
    id: row.id,
    name: row.name,
    filter,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};


async function findPickerFilter(ctx, householdId, filterId) {
  const result = await ctx.env.DB.prepare(`
    SELECT id, name, filterJson, createdAt, updatedAt
      FROM GamePickerFilter
     WHERE householdId = ? AND id = ?
  `).bind(householdId, filterId).all();

  return getDBResult('dbPickerFilter', 'find_filter', result)[0] ?? null;
}


async function pickerFilterNameTaken(ctx, householdId, name, excludeId = null) {
  const result = await ctx.env.DB.prepare(`
    SELECT id
      FROM GamePickerFilter
     WHERE householdId = ?
       AND name = ? COLLATE NOCASE
       AND (? IS NULL OR id != ?)
     LIMIT 1
  `).bind(householdId, name, excludeId, excludeId).all();

  return getDBResult('dbPickerFilter', 'check_name', result)[0] ?? null;
}


/******************************************************************************/


/* The household's saved filters, most recently updated first. */
export async function dbPickerFiltersList(ctx, householdId) {
  const result = await ctx.env.DB.prepare(`
    SELECT id, name, filterJson, createdAt, updatedAt
      FROM GamePickerFilter
     WHERE householdId = ?
     ORDER BY COALESCE(updatedAt, createdAt) DESC, id DESC
  `).bind(householdId).all();

  return getDBResult('dbPickerFiltersList', 'find_filters', result)
    .map(mapPickerFilter);
}


/******************************************************************************/


/* Save a filter for the whole household. Duplicate names are reported so the
 * route can answer 409 and the UI can offer Replace. */
export async function dbPickerFilterCreate(ctx, options = {}) {
  const { householdId, userId, name, filter } = options;
  const existing = await pickerFilterNameTaken(ctx, householdId, name);

  if (existing !== null) {
    return { conflict: true, existingId: existing.id, filter: null };
  }

  const insert = await ctx.env.DB.prepare(`
    INSERT INTO GamePickerFilter (householdId, userId, name, filterJson, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(householdId, userId, name, JSON.stringify(filter)).run();

  const row = await findPickerFilter(ctx, householdId, insert.meta.last_row_id);

  return { conflict: false, existingId: null, filter: mapPickerFilter(row) };
}


/******************************************************************************/


/* Edit or rename a saved filter. Scoping the fetch by household is what turns
 * a filter from another household into a 404 instead of a cross-tenant write. */
export async function dbPickerFilterUpdate(ctx, options = {}) {
  const { householdId, filterId, name, filter } = options;
  const current = await findPickerFilter(ctx, householdId, filterId);

  if (current === null) {
    return { notFound: true, conflict: false, existingId: null, filter: null };
  }

  if (name !== undefined) {
    const existing = await pickerFilterNameTaken(ctx, householdId, name, filterId);

    if (existing !== null) {
      return { notFound: false, conflict: true, existingId: existing.id, filter: null };
    }
  }

  await ctx.env.DB.prepare(`
    UPDATE GamePickerFilter
       SET name = COALESCE(?, name),
           filterJson = COALESCE(?, filterJson),
           updatedAt = datetime('now')
     WHERE householdId = ? AND id = ?
  `).bind(
    name ?? null,
    filter === undefined ? null : JSON.stringify(filter),
    householdId,
    filterId
  ).run();

  const row = await findPickerFilter(ctx, householdId, filterId);

  return { notFound: false, conflict: false, existingId: null, filter: mapPickerFilter(row) };
}


/******************************************************************************/


/* Delete a saved filter. The household scope makes another household's id
 * indistinguishable from a missing one. */
export async function dbPickerFilterDelete(ctx, householdId, filterId) {
  const result = await ctx.env.DB.prepare(`
    DELETE FROM GamePickerFilter
     WHERE householdId = ? AND id = ?
  `).bind(householdId, filterId).run();

  return result.meta.changes > 0;
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
