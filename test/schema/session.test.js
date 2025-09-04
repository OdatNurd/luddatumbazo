import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validate } from "../../service/src/requests/common.js"

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
      .value(schemaTest('param', SessionIDSchema, { sessionId: '123' }, validate))
      .isObject()
      .eq($.sessionId, 123);

    await $check`should fail if sessionId is not a number`
      .value(schemaTest('param', SessionIDSchema, { sessionId: 'abc' }, validate))
      .isResponseWithStatus($, 400);

    await $check`should fail if sessionId is missing`
      .value(schemaTest('param', SessionIDSchema, { }, validate))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "SessionListParamSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with no parameters`
      .value(schemaTest('query', SessionListParamSchema, { }, validate))
      .isObject()
      .eq($.reverse, false)
      .isArray($.games)
      .eq($.games.length, 0);

    await $check`should succeed with reverse parameter`
      .value(schemaTest('query', SessionListParamSchema, { reverse: 'true' }, validate))
      .isObject()
      .eq($.reverse, true);

    await $check`should succeed with a single game slug`
      .value(schemaTest('query', SessionListParamSchema, { games: 'a-slug' }, validate))
      .isObject()
      .eq($.games[0], 'a-slug');

    await $check`should succeed with a comma-separated list of games`
      .value(schemaTest('query', SessionListParamSchema, { games: '123,a-slug,456' }, validate))
      .isObject()
      .eq($.games[0], 123)
      .eq($.games[1], 'a-slug')
      .eq($.games[2], 456);
  },


  /****************************************************************************/


  "NewSessionReportSchema": async ({ runScope: ctx }) => {
    const validSession = {
      gameId: 1,
      playType: 'cardboard',
      sessionBegin: new Date().toISOString(),
      isLearning: false,
      reportingUser: 1,
      players: {
        users: [{ userId: 1 }],
        guests: []
      }
    };

    await $check`should succeed with minimal valid data`
      .value(schemaTest('json', NewSessionReportSchema, validSession, validate))
      .isObject()
      .eq($.gameId, 1);

    await $check`should fail if gameId is missing`
      .value(schemaTest('json', NewSessionReportSchema, { ...validSession, gameId: undefined }, validate))
      .isResponseWithStatus($, 400);

    await $check`should fail if playType is invalid`
      .value(schemaTest('json', NewSessionReportSchema, { ...validSession, playType: 'invalid' }, validate))
      .isResponseWithStatus($, 400);

    await $check`should fail if sessionBegin is not a datetime`
      .value(schemaTest('json', NewSessionReportSchema, { ...validSession, sessionBegin: 'not-a-date' }, validate))
      .isResponseWithStatus($, 400);

    await $check`should fail if there are no players`
      .value(schemaTest('json', NewSessionReportSchema, { ...validSession, players: { users: [], guests: [] } }, validate))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "UpdateSessionReportSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a valid title`
      .value(schemaTest('json', UpdateSessionReportSchema, { title: 'A New Title' }, validate))
      .isObject()
      .eq($.title, 'A New Title');

    await $check`should succeed with an empty object`
        .value(schemaTest('json', UpdateSessionReportSchema, { }, validate))
        .isObject()
        .keyCount($, 0);

    await $check`should fail if sessionEnd is not a valid datetime`
      .value(schemaTest('json', UpdateSessionReportSchema, { sessionEnd: 'not-a-date' }, validate))
      .isResponseWithStatus($, 400);
  },
});


/******************************************************************************/
