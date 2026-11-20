import { Collection, $check, $ } from "@axel669/aegis";
import { execSQLFiles } from "@odatnurd/d1-query/aegis";

import { dbPlayerStats } from '#db/insights';


/******************************************************************************/


const people = (...keys) => ({
  keys,
  users: keys.filter(key => key.startsWith('u:')).map(key => Number(key.slice(2))),
  guests: keys.filter(key => key.startsWith('g:')).map(key => Number(key.slice(2)))
});

const byKey = (report, key) => report.players.find(person => person.key === key);


/******************************************************************************/


export default Collection`Player Stats`({
  "group report": async ({ runScope: ctx }) => {
    await execSQLFiles(ctx.env.DB, 'test/db/insights-setup.sql');

    const report = await dbPlayerStats(ctx, {
      players: people('u:1', 'u:2')
    });

    await $check`should use every session that includes a selected person`
      .value(report.group)
      .isObject()
      .eq($.sessions, 7)
      .eq($.appearances, 12)
      .eq($.multiplayerSessions, 6)
      .eq($.decidedSessions, 5)
      .eq($.undecidedSessions, 1)
      .eq($.soloSessions, 1)
      .eq($.learningExcluded, 1);

    await $check`should count seat splits only where the session is decided and has a starter`
      .value(report.group)
      .isObject()
      .eq($.seatSessions, 4)
      .eq($.seatWins, 4)
      .eq($.seatWinPct, 100);

    await $check`should ignore a zero or negative duration but count the session`
      .value(report.group)
      .isObject()
      .eq($.invalidDurations, 1)
      .eq($.minDurationMinutes, 10)
      .eq($.avgDurationMinutes, 30.8)
      .eq($.maxDurationMinutes, 60);

    await $check`should report the missing-starter caveat as a count`
      .value(report.warnings)
      .isArray($)
      .eq($.length, 5)
      .eq($[0].code, 'undecided-sessions')
      .eq($[1].code, 'solo-sessions')
      .eq($[2].code, 'missing-starters')
      .eq($[3].code, 'invalid-durations')
      .eq($[4].code, 'learning-excluded');

    const terence = byKey(report, 'u:1');
    const marisue = byKey(report, 'u:2');

    await $check`should scope each person's plays to that person`
      .value(terence)
      .isObject()
      .eq($.plays, 7)
      .eq($.decided, 5)
      .eq($.wins, 5)
      .eq($.losses, 0)
      .eq($.winPct, 100)
      .eq($.starts, 4)
      .eq($.starterWins, 4)
      .eq($.starterWinPct, 100)
      .eq($.nonStarts, 0)
      .eq($.nonStarterWinPct, null);

    await $check`should count every winner in a tie and exclude missing starters from otherwise`
      .value(marisue)
      .isObject()
      .eq($.plays, 5)
      .eq($.decided, 4)
      .eq($.wins, 1)
      .eq($.losses, 3)
      .eq($.winPct, 25)
      .eq($.starts, 0)
      .eq($.starterWinPct, null)
      .eq($.nonStarts, 3)
      .eq($.nonStarterWins, 1)
      .eq($.nonStarterWinPct, 33.33);

    await $check`should break games down only when no game is selected`
      .value(report.games)
      .isArray($)
      .eq($.length, 2)
      .eq($[0].slug, 'azul')
      .eq($[0].plays, 5)
      .eq($[0].distinctPlayers, 2)
      .eq($[0].avgDurationMinutes, 32)
      .eq($[1].slug, 'calico')
      .eq($[1].plays, 2)
      .eq($[1].distinctPlayers, 3);
  },


  /****************************************************************************/


  "learning and filters": async ({ runScope: ctx }) => {
    await execSQLFiles(ctx.env.DB, 'test/db/insights-setup.sql');

    const included = await dbPlayerStats(ctx, {
      players: people('u:1', 'u:2'),
      includeLearning: true
    });

    await $check`should include learning sessions when asked`
      .value(included.group)
      .isObject()
      .eq($.sessions, 8)
      .eq($.appearances, 14)
      .eq($.learningExcluded, 0)
      .eq($.decidedSessions, 6);

    await $check`should not warn about excluded learning sessions when they were included`
      .value(included.warnings.map(warning => warning.code))
      .isArray($)
      .eq($.includes('learning-excluded'), false);

    const dates = await dbPlayerStats(ctx, {
      players: people('u:1', 'u:2'),
      from: '2024-01-02T00:00:00.000Z',
      to: '2024-01-03T23:59:59.999Z'
    });

    await $check`should apply an inclusive date range`
      .value(dates.group)
      .isObject()
      .eq($.sessions, 2)
      .eq($.decidedSessions, 1)
      .eq($.undecidedSessions, 1)
      .eq($.seatSessions, 1)
      .eq($.seatWins, 1)
      .eq($.avgDurationMinutes, 25);

    const bga = await dbPlayerStats(ctx, {
      players: people('u:1', 'g:50'),
      playType: 'boardgamearena'
    });

    await $check`should filter by play type`
      .value(bga.group)
      .isObject()
      .eq($.sessions, 1)
      .eq($.decidedSessions, 1);

    const malformed = await dbPlayerStats(ctx, {
      players: people('u:1'),
      playType: 'steam'
    });

    await $check`should return an empty report rather than failing when nothing matches`
      .value(malformed)
      .isObject()
      .eq($.group.sessions, 0)
      .eq($.group.avgDurationMinutes, null)
      .eq($.players.length, 0)
      .eq($.games.length, 0)
      .eq($.warnings.length, 0);
  },


  /****************************************************************************/


  "game scoped and game only": async ({ runScope: ctx }) => {
    await execSQLFiles(ctx.env.DB, 'test/db/insights-setup.sql');

    const scoped = await dbPlayerStats(ctx, {
      players: people('u:1', 'u:2'),
      gameId: 100
    });

    await $check`should combine people and a game`
      .value(scoped.group)
      .isObject()
      .eq($.sessions, 5)
      .eq($.decidedSessions, 3)
      .eq($.soloSessions, 1)
      .eq($.seatSessions, 2)
      .eq($.seatWins, 2)
      .eq($.learningExcluded, 1);

    await $check`should hide the games breakdown for a game scoped report`
      .value(scoped.games)
      .isArray($)
      .eq($.length, 0);

    const gameOnly = await dbPlayerStats(ctx, { gameId: 100 });

    await $check`should rank every player when only a game is selected`
      .value(gameOnly.group)
      .isObject()
      .eq($.sessions, 5)
      .eq($.appearances, 9)
      .eq($.multiplayerSessions, 4)
      .eq($.decidedSessions, 3)
      .eq($.undecidedSessions, 1)
      .eq($.soloSessions, 1)
      .eq($.seatSessions, 2)
      .eq($.seatWinPct, 100)
      .eq($.minDurationMinutes, 10)
      .eq($.avgDurationMinutes, 32)
      .eq($.maxDurationMinutes, 60);

    await $check`should order the game-only ranking by plays`
      .value(gameOnly.players)
      .isArray($)
      .eq($.length, 2)
      .eq($[0].key, 'u:1')
      .eq($[0].plays, 5)
      .eq($[0].wins, 3)
      .eq($[0].sharePct, 100)
      .eq($[1].key, 'u:2')
      .eq($[1].plays, 4)
      .eq($[1].wins, 1);

    const unknown = await dbPlayerStats(ctx, { gameId: 999 });

    await $check`should return zeroes for an unknown game id`
      .value(unknown.group)
      .isObject()
      .eq($.sessions, 0)
      .eq($.seatWinPct, null)
      .eq($.minDurationMinutes, null);
  },


  /****************************************************************************/


  "guest identity": async ({ runScope: ctx }) => {
    await execSQLFiles(ctx.env.DB, 'test/db/insights-setup.sql');

    const report = await dbPlayerStats(ctx, {
      players: people('g:50')
    });

    await $check`should treat a guest as its own identity`
      .value(report.group)
      .isObject()
      .eq($.sessions, 1)
      .eq($.appearances, 1)
      .eq($.seatSessions, 1)
      .eq($.seatWins, 1);

    await $check`should read the guest's own result row`
      .value(report.players)
      .isArray($)
      .eq($.length, 1)
      .eq($[0].key, 'g:50')
      .eq($[0].userId, null)
      .eq($[0].guestId, 50)
      .eq($[0].name, 'Wayne T.')
      .eq($[0].plays, 1)
      .eq($[0].decided, 1)
      .eq($[0].wins, 0)
      .eq($[0].losses, 1)
      .eq($[0].nonStarts, 1);
  }
});
