import { Collection, $check, $ } from "@axel669/aegis";
import { execSQLFiles } from "@odatnurd/d1-query/aegis";

import { dbSessionList, dbSessionStatus } from '#db/session';


/******************************************************************************/


/* The status counts are a small, security-adjacent summary: household history
 * is personalization, but the wrong player join would make the menu shortcut
 * appear for the wrong people. These checks use a real local D1 database so
 * the joins and distinct-session behavior are exercised together. */
export default Collection`Session Status Counts`({
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
                    (108, 100, 100, 'cardboard', 2, '2026-01-08T10:00:00Z', '2026-01-08T11:00:00Z')
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
                    (108, 'Session 108', '')
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
                    (1010, 108, 2, NULL, 1)
      `)
    ]);

    await $check`should count all reports and only null-ended reports as open`
      .value(await dbSessionStatus(ctx, 1))
      .isObject()
      .eq($.total, 8)
      .eq($.open, 4);

    await $check`should count distinct reports with a player in any shared household`
      .value(await dbSessionStatus(ctx, 1))
      .isObject()
      .eq($.householdSessions, 5)
      .eq($.householdOpen, 3);

    await $check`should return zero household counts for a user with no memberships`
      .value(await dbSessionStatus(ctx, 999))
      .isObject()
      .eq($.total, 8)
      .eq($.open, 4)
      .eq($.householdSessions, 0)
      .eq($.householdOpen, 0);

    const open = await dbSessionList(ctx, { status: 'open' });
    const closed = await dbSessionList(ctx, { status: 'closed' });
    const complete = await dbSessionList(ctx);
    const seven = open.find(row => row.id === 107);

    await $check`should filter the list to open reports and mark them open`
      .value(open)
      .isArray($)
      .eq($.length, 4)
      .eq($[0].isOpen, true);

    await $check`should filter the list to closed reports`
      .value(closed)
      .isArray($)
      .eq($.length, 4)
      .eq($[0].isOpen, false);

    await $check`should return the complete list when status is omitted`
      .value(complete)
      .isArray($)
      .eq($.length, 8);

    await $check`should attach the batched player summary to each list row`
      .value(seven)
      .isObject()
      .eq($.players.length, 2)
      .eq($.players[0].key, 'u:1')
      .eq($.players[1].key, 'u:2');
  },
});


/******************************************************************************/
