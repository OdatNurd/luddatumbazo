import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validateZod } from '#legacyvalidator';

import { PlayerStatsParamSchema } from '#schema/insights';


/******************************************************************************/


export default Collection`Insights Schema Validation`({
  "PlayerStatsParamSchema": async ({ runScope: ctx }) => {
    await $check`should parse people and default learning to excluded`
      .value(schemaTest('query', PlayerStatsParamSchema, {
        players: 'u:1,g:2'
      }, validateZod))
      .isObject()
      .eq($.players.keys.length, 2)
      .eq($.players.users[0], 1)
      .eq($.players.guests[0], 2)
      .eq($.includeLearning, false);

    await $check`should accept a numeric game reference`
      .value(schemaTest('query', PlayerStatsParamSchema, {
        game: '14'
      }, validateZod))
      .isObject()
      .eq($.game, 14)
      .eq($.players.keys.length, 0);

    await $check`should accept a slug game reference`
      .value(schemaTest('query', PlayerStatsParamSchema, {
        game: 'azul'
      }, validateZod))
      .isObject()
      .eq($.game, 'azul');

    await $check`should accept includeLearning=true`
      .value(schemaTest('query', PlayerStatsParamSchema, {
        game: 'azul',
        includeLearning: 'true'
      }, validateZod))
      .isObject()
      .eq($.includeLearning, true);

    await $check`should require at least one person or a game`
      .value(schemaTest('query', PlayerStatsParamSchema, { }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should reject a reversed date range`
      .value(schemaTest('query', PlayerStatsParamSchema, {
        players: 'u:1',
        from: '2024-02-01T00:00:00Z',
        to: '2024-01-01T00:00:00Z'
      }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should reject a malformed player key`
      .value(schemaTest('query', PlayerStatsParamSchema, {
        players: 'x:1'
      }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should reject an unknown play type`
      .value(schemaTest('query', PlayerStatsParamSchema, {
        players: 'u:1',
        playType: 'nintendo'
      }, validateZod))
      .isResponseWithStatus($, 400);
  }
});
