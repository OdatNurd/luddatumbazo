import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validateZod } from '#legacyvalidator';

import {
  SessionIDSchema,
  SessionListParamSchema,
  NewSessionReportSchema,
  UpdateSessionReportSchema
} from "#schema/session";


/******************************************************************************/


export default Collection`Session Schema Validation`({
  "SessionIDSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a valid numeric string`
      .value(schemaTest('param', SessionIDSchema, { sessionId: '123' }, validateZod))
      .isObject()
      .eq($.sessionId, 123);

    await $check`should fail if sessionId is not a number`
      .value(schemaTest('param', SessionIDSchema, { sessionId: 'abc' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should fail if sessionId is missing`
      .value(schemaTest('param', SessionIDSchema, { }, validateZod))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "SessionListParamSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with no parameters`
      .value(schemaTest('query', SessionListParamSchema, { }, validateZod))
      .isObject()
      .eq($.reverse, false)
      .isArray($.games)
      .eq($.games.length, 0)
      .eq($.match, 'all')
      .eq($.players.keys.length, 0)
      .eq($.players.users.length, 0)
      .eq($.players.guests.length, 0);

    await $check`should succeed with reverse parameter`
      .value(schemaTest('query', SessionListParamSchema, { reverse: 'true' }, validateZod))
      .isObject()
      .eq($.reverse, true);

    await $check`should succeed with a single game slug`
      .value(schemaTest('query', SessionListParamSchema, { games: 'a-slug' }, validateZod))
      .isObject()
      .eq($.games[0], 'a-slug');

    await $check`should succeed with a comma-separated list of games`
      .value(schemaTest('query', SessionListParamSchema, { games: '123,a-slug,456' }, validateZod))
      .isObject()
      .eq($.games[0], 123)
      .eq($.games[1], 'a-slug')
      .eq($.games[2], 456);

    await $check`should accept the open status filter`
      .value(schemaTest('query', SessionListParamSchema, { status: 'open' }, validateZod))
      .isObject()
      .eq($.status, 'open');

    await $check`should accept the closed status filter`
      .value(schemaTest('query', SessionListParamSchema, { status: 'closed' }, validateZod))
      .isObject()
      .eq($.status, 'closed');

    await $check`should fail for an unknown status filter`
      .value(schemaTest('query', SessionListParamSchema, { status: 'running' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should parse user and guest player keys and collapse duplicates`
      .value(schemaTest('query', SessionListParamSchema, { players: 'u:1,g:4,u:1' }, validateZod))
      .isObject()
      .eq($.players.keys.length, 2)
      .eq($.players.keys[0], 'u:1')
      .eq($.players.keys[1], 'g:4')
      .eq($.players.users[0], 1)
      .eq($.players.guests[0], 4);

    await $check`should accept repeated player query values`
      .value(schemaTest('query', SessionListParamSchema, { players: ['u:1', 'g:4'] }, validateZod))
      .isObject()
      .eq($.players.keys.length, 2);

    await $check`should fail for a malformed player key`
      .value(schemaTest('query', SessionListParamSchema, { players: 'u:1,x:4' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should accept the any match mode`
      .value(schemaTest('query', SessionListParamSchema, { match: 'any' }, validateZod))
      .isObject()
      .eq($.match, 'any');

    await $check`should accept the all match mode`
      .value(schemaTest('query', SessionListParamSchema, { match: 'all' }, validateZod))
      .isObject()
      .eq($.match, 'all');

    await $check`should fail for an unknown match mode`
      .value(schemaTest('query', SessionListParamSchema, { match: 'some' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should accept the me household filter`
      .value(schemaTest('query', SessionListParamSchema, { household: 'me' }, validateZod))
      .isObject()
      .eq($.household, 'me');

    await $check`should fail for an unknown household filter`
      .value(schemaTest('query', SessionListParamSchema, { household: 'all' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should accept an ISO date range`
      .value(schemaTest('query', SessionListParamSchema, {
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T23:59:59.999Z'
      }, validateZod))
      .isObject()
      .eq($.from, '2026-01-01T00:00:00.000Z')
      .eq($.to, '2026-01-02T23:59:59.999Z');

    await $check`should fail for a reversed date range`
      .value(schemaTest('query', SessionListParamSchema, {
        from: '2026-01-02T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z'
      }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should fail for a non-ISO date bound`
      .value(schemaTest('query', SessionListParamSchema, { from: '2026-01-01' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should accept play type and learning filters`
      .value(schemaTest('query', SessionListParamSchema, {
        playType: 'steam',
        learning: 'true'
      }, validateZod))
      .isObject()
      .eq($.playType, 'steam')
      .eq($.learning, true);

    await $check`should parse an explicit false learning filter`
      .value(schemaTest('query', SessionListParamSchema, { learning: 'false' }, validateZod))
      .isObject()
      .eq($.learning, false);

    await $check`should fail for an unknown play type`
      .value(schemaTest('query', SessionListParamSchema, { playType: 'nintendo' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should fail for an unknown learning value`
      .value(schemaTest('query', SessionListParamSchema, { learning: 'yes' }, validateZod))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "NewSessionReportSchema": async ({ runScope: ctx }) => {
    const validSession = {
      gameId: 1,
      playType: 'cardboard',
      sessionBegin: new Date().toISOString(),
      isLearning: false,
      players: {
        users: [{ userId: 1 }],
        guests: []
      }
    };

    await $check`should succeed with minimal valid data`
      .value(schemaTest('json', NewSessionReportSchema, validSession, validateZod))
      .isObject()
      .eq($.gameId, 1);

    await $check`should fail if gameId is missing`
      .value(schemaTest('json', NewSessionReportSchema, { ...validSession, gameId: undefined }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should fail if playType is invalid`
      .value(schemaTest('json', NewSessionReportSchema, { ...validSession, playType: 'invalid' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should fail if sessionBegin is not a datetime`
      .value(schemaTest('json', NewSessionReportSchema, { ...validSession, sessionBegin: 'not-a-date' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should fail if there are no players`
      .value(schemaTest('json', NewSessionReportSchema, { ...validSession, players: { users: [], guests: [] } }, validateZod))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "UpdateSessionReportSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a valid title`
      .value(schemaTest('json', UpdateSessionReportSchema, { title: 'A New Title' }, validateZod))
      .isObject()
      .eq($.title, 'A New Title');

    await $check`should succeed with an empty object`
        .value(schemaTest('json', UpdateSessionReportSchema, { }, validateZod))
        .isObject()
        .keyCount($, 0);

    await $check`should fail if sessionEnd is not a valid datetime`
      .value(schemaTest('json', UpdateSessionReportSchema, { sessionEnd: 'not-a-date' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should accept player results by stable player id`
      .value(schemaTest('json', UpdateSessionReportSchema, {
        players: [{ playerId: 12, score: 42, isWinner: true, isStartingPlayer: false }]
      }, validateZod))
      .isObject()
      .eq($.players[0].playerId, 12)
      .eq($.players[0].score, 42);

    await $check`should fail if a player result has no player id`
      .value(schemaTest('json', UpdateSessionReportSchema, {
        players: [{ score: 42 }]
      }, validateZod))
      .isResponseWithStatus($, 400);
  },
});


/******************************************************************************/
