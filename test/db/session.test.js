import { Collection, $check, $ } from "@axel669/aegis";
import { execSQLFiles } from "@odatnurd/d1-query/aegis";

import { dbSessionList, dbSessionStatus } from '#db/session';


/******************************************************************************/


/* The status counts are a small, security-adjacent summary: household history
 * is personalization, but the wrong player join would make the menu shortcut
 * appear for the wrong people. These checks use a real local D1 database so
 * the joins and distinct-session behavior are exercised together. */
export default Collection`Session Status and List Filters`({
  "dbSessionStatus": async ({ runScope: ctx }) => {
    // Load only the tables these counts exercise. The full bootstrap schema
    // contains multi-line triggers that the lightweight test SQL splitter does
    // not preserve, and none of them affect this query.
    await execSQLFiles(ctx.env.DB, 'test/db/setup.sql');

    await ctx.env.DB.batch([
      // Users 1 and 2 share household 10; user 1 also belongs to household 11
      // with user 3. User 4 is in a household the current user does not share.
      ctx.env.DB.prepare(`
        INSERT INTO Household (id, name, slug)
             VALUES (10, 'Shared', 'shared'),
                    (11, 'Second', 'second'),
                    (12, 'Other', 'other')
      `),
      ctx.env.DB.prepare(`
        INSERT INTO User
          (id, externalId, firstName, lastName, displayName, emailAddress)
             VALUES (1, 'user-1', 'One', 'User', 'User One', 'one@example.com'),
                    (2, 'user-2', 'Two', 'User', 'User Two', 'two@example.com'),
                    (3, 'user-3', 'Three', 'User', 'User Three', 'three@example.com'),
                    (4, 'user-4', 'Four', 'User', 'User Four', 'four@example.com')
      `),
      ctx.env.DB.prepare(`
        INSERT INTO UserHousehold (userId, householdId, isPrimary)
             VALUES (1, 10, 1),
                    (1, 11, 0),
                    (2, 10, 1),
                    (3, 11, 1),
                    (4, 12, 1)
      `),
      ctx.env.DB.prepare(`
        INSERT INTO Game (id, slug, description, publishedIn)
             VALUES (100, 'test-game', 'A game for session status tests', 2026)
      `),
      ctx.env.DB.prepare(`
        INSERT INTO GameName (id, gameId, name, isPrimary)
             VALUES (100, 100, 'Test Game', 1)
      `),
      ctx.env.DB.prepare(`
        INSERT INTO GuestUser (id, firstName, lastName, displayName)
             VALUES (50, 'Guest', 'Player', 'Guest Player')
      `),
      ctx.env.DB.prepare(`
        INSERT INTO SessionReport
          (id, gameId, gameName, playType, loggingPlayerId, sessionBegin, sessionEnd)
             VALUES (101, 100, 100, 'cardboard', 1, '2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z'),
                    (102, 100, 100, 'cardboard', 2, '2026-01-02T10:00:00Z', NULL),
                    (103, 100, 100, 'cardboard', 2, '2026-01-03T10:00:00Z', '2026-01-03T11:00:00Z'),
                    (104, 100, 100, 'cardboard', 1, '2026-01-04T10:00:00Z', NULL),
                    (105, 100, 100, 'cardboard', 3, '2026-01-05T10:00:00Z', NULL),
                    (106, 100, 100, 'cardboard', 4, '2026-01-06T10:00:00Z', '2026-01-06T11:00:00Z'),
                    (107, 100, 100, 'cardboard', 1, '2026-01-07T10:00:00Z', NULL),
                    (108, 100, 100, 'cardboard', 2, '2026-01-08T10:00:00Z', '2026-01-08T11:00:00Z'),
                    (109, 100, 100, 'steam', 1, '2026-01-09T10:00:00Z', NULL)
      `),
      ctx.env.DB.prepare(`
        UPDATE SessionReport SET isLearning = 1 WHERE id = 109
      `),
      ctx.env.DB.prepare(`
        INSERT INTO SessionReportDetails (sessionId, title, content)
             VALUES (101, 'Session 101', ''),
                    (102, 'Session 102', ''),
                    (103, 'Session 103', ''),
                    (104, 'Session 104', ''),
                    (105, 'Session 105', ''),
                    (106, 'Session 106', ''),
                    (107, 'Session 107', ''),
                    (108, 'Session 108', ''),
                    (109, 'Session 109', '')
      `),
      ctx.env.DB.prepare(`
        INSERT INTO SessionReportPlayer
          (id, sessionId, userId, guestId, isReporter)
             VALUES (1001, 101, 1, NULL, 1),
                    (1002, 101, NULL, 50, 0),
                    (1003, 102, 2, NULL, 1),
                    (1004, 103, NULL, 50, 1),
                    (1005, 104, NULL, 50, 0),
                    (1006, 105, 3, NULL, 1),
                    (1007, 106, 4, NULL, 1),
                    (1008, 107, 1, NULL, 1),
                    (1009, 107, 2, NULL, 0),
                    (1010, 108, 2, NULL, 1),
                    (1011, 109, 1, NULL, 1),
                    (1012, 109, NULL, 50, 0)
      `)
    ]);

    await $check`should count all reports and only null-ended reports as open`
      .value(await dbSessionStatus(ctx, 1))
      .isObject()
      .eq($.total, 9)
      .eq($.open, 5);

    await $check`should count distinct reports with a player in any shared household`
      .value(await dbSessionStatus(ctx, 1))
      .isObject()
      .eq($.householdSessions, 6)
      .eq($.householdOpen, 4);

    await $check`should return zero household counts for a user with no memberships`
      .value(await dbSessionStatus(ctx, 999))
      .isObject()
      .eq($.total, 9)
      .eq($.open, 5)
      .eq($.householdSessions, 0)
      .eq($.householdOpen, 0);

    const open = await dbSessionList(ctx, { status: 'open' });
    const closed = await dbSessionList(ctx, { status: 'closed' });
    const complete = await dbSessionList(ctx);
    const seven = open.find(row => row.id === 107);
    const ids = rows => rows.map(row => row.id);
    const players = (...keys) => ({ keys });

    await $check`should filter the list to open reports and mark them open`
      .value(open)
      .isArray($)
      .eq($.length, 5)
      .eq($[0].isOpen, true);

    await $check`should filter the list to closed reports`
      .value(closed)
      .isArray($)
      .eq($.length, 4)
      .eq($[0].isOpen, false);

    await $check`should return the complete list when status is omitted`
      .value(complete)
      .isArray($)
      .eq($.length, 9);

    await $check`should attach the batched player summary to each list row`
      .value(seven)
      .isObject()
      .eq($.players.length, 2)
      .eq($.players[0].key, 'u:1')
      .eq($.players[1].key, 'u:2');

    await $check`should mark household sessions from every shared household`
      .value(ids(await dbSessionList(ctx, {
        userId: 1,
        household: 'me',
        reverse: true
      })))
      .isArray($)
      .eq($.length, 6)
      .eq($[0], 109)
      .eq($[1], 107)
      .eq($[2], 105)
      .eq($[3], 102)
      .eq($[4], 108)
      .eq($[5], 101);

    await $check`should exclude guest-only and other-household sessions from the me filter`
      .value(ids(await dbSessionList(ctx, { userId: 1, household: 'me', reverse: true })))
      .isArray($)
      .eq($.length, 6)
      .eq($[0], 109)
      .eq($[5], 101);

    await $check`should match any selected user when match is any`
      .value(ids(await dbSessionList(ctx, {
        userId: 1,
        players: players('u:1', 'u:2'),
        match: 'any'
      })))
      .isArray($)
      .eq($.length, 5)
      .includes($, 101)
      .includes($, 102)
      .includes($, 107)
      .includes($, 108)
      .includes($, 109);

    await $check`should require every selected user by default`
      .value(ids(await dbSessionList(ctx, {
        userId: 1,
        players: players('u:1', 'u:2')
      })))
      .isArray($)
      .eq($.length, 1)
      .eq($[0], 107);

    await $check`should mix users and guests when match is any`
      .value(ids(await dbSessionList(ctx, {
        userId: 1,
        players: players('u:3', 'g:50'),
        match: 'any'
      })))
      .isArray($)
      .eq($.length, 5)
      .includes($, 101)
      .includes($, 103)
      .includes($, 104)
      .includes($, 105)
      .includes($, 109);

    await $check`should return no rows when all match cannot be satisfied`
      .value(await dbSessionList(ctx, {
        userId: 1,
        players: players('u:3', 'g:50'),
        match: 'all'
      }))
      .isArray($)
      .eq($.length, 0);

    await $check`should collapse duplicate player keys`
      .value(ids(await dbSessionList(ctx, {
        userId: 1,
        players: players('u:1', 'u:1')
      })))
      .isArray($)
      .eq($.length, 3)
      .includes($, 101)
      .includes($, 107)
      .includes($, 109);

    await $check`should return the complete list when no players are selected`
      .value(ids(await dbSessionList(ctx, {
        userId: 1,
        players: players()
      })))
      .isArray($)
      .eq($.length, 9);

    await $check`should compose status with a player filter`
      .value(ids(await dbSessionList(ctx, {
        userId: 1,
        status: 'open',
        players: players('u:1')
      })))
      .isArray($)
      .eq($.length, 2)
      .includes($, 107)
      .includes($, 109);

    await $check`should compose a date range with the other filters`
      .value(ids(await dbSessionList(ctx, {
        userId: 1,
        from: '2026-01-02T00:00:00.000Z',
        to: '2026-01-04T23:59:59.999Z'
      })))
      .isArray($)
      .eq($.length, 3)
      .includes($, 102)
      .includes($, 103)
      .includes($, 104);

    await $check`should filter by play type and learning flag`
      .value(ids(await dbSessionList(ctx, {
        userId: 1,
        playType: 'steam',
        learning: true
      })))
      .isArray($)
      .eq($.length, 1)
      .eq($[0], 109);

    await $check`should return isHousehold as a real boolean`
      .value(await dbSessionList(ctx, { userId: 1, status: 'open' }))
      .isArray($)
      .eq($.find(row => row.id === 109).isHousehold, true)
      .eq($.find(row => row.id === 104).isHousehold, false);

    await $check`should group household and open rows before date order`
      .value(ids(await dbSessionList(ctx, { userId: 1, reverse: true })))
      .isArray($)
      .eq($.length, 9)
      .eq($[0], 109)
      .eq($[1], 107)
      .eq($[2], 105)
      .eq($[3], 102)
      .eq($[4], 108)
      .eq($[5], 101)
      .eq($[6], 104)
      .eq($[7], 106)
      .eq($[8], 103);

    await $check`should reverse only the date direction within each group`
      .value(ids(await dbSessionList(ctx, { userId: 1 })))
      .isArray($)
      .eq($[0], 102)
      .eq($[1], 105)
      .eq($[2], 107)
      .eq($[3], 109)
      .eq($[4], 101)
      .eq($[5], 108);

    await $check`should keep game-scoped session lists chronological`
      .value(ids(await dbSessionList(ctx, {
        userId: 1,
        gameIds: [100],
        reverse: true
      })))
      .isArray($)
      .eq($.length, 9)
      .eq($[0], 109)
      .eq($[1], 108)
      .eq($[8], 101);

    await $check`should compose a game filter with player and status filters`
      .value(ids(await dbSessionList(ctx, {
        userId: 1,
        gameIds: [100],
        status: 'open',
        players: { keys: ['u:1'] }
      })))
      .isArray($)
      .eq($.length, 2)
      .eq($[0], 107)
      .eq($[1], 109);

    await $check`should mark the same number of household rows as the status count`
      .value((await dbSessionList(ctx, { userId: 1 }))
        .filter(row => row.isHousehold === true).length)
      .eq($, 6);

    await $check`should expose a searchable roster string with the players`
      .value((await dbSessionList(ctx, { userId: 1 }))
        .find(row => row.id === 107)
        .playerNames)
      .eq($, 'User One, User Two');
  },
});


/******************************************************************************/
