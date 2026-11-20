import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validateZod } from '#legacyvalidator';

import {
  PlayerStatsParamSchema, PickerFilterSchema, PickerSearchSchema,
  PickerFilterSaveSchema, PickerFilterUpdateSchema, PickerFilterIdSchema
} from '#schema/insights';


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
  },


  /****************************************************************************/


  "PickerFilterSchema": async ({ runScope: ctx }) => {
    await $check`should fill in the picker defaults from an empty filter`
      .value(schemaTest('json', PickerFilterSchema, { }, validateZod))
      .isObject()
      .eq($.version, 1)
      .eq($.players.min, undefined)
      .eq($.time.mode, 'overlap')
      .eq($.complexity.max, undefined)
      .eq($.categories.length, 0)
      .eq($.mechanics.length, 0)
      .eq($.history.enabled, false)
      .eq($.history.players.length, 0)
      .eq($.history.mode, 'exclude');

    await $check`should deduplicate metadata slugs`
      .value(schemaTest('json', PickerFilterSchema, {
        categories: [1, 1],
        mechanics: [4]
      }, validateZod))
      .isObject()
      .eq($.categories.length, 1)
      .eq($.mechanics[0], 4);

    await $check`should reject a reversed bound pair`
      .value(schemaTest('json', PickerFilterSchema, {
        players: { min: 4, max: 2 }
      }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should reject history without anyone selected`
      .value(schemaTest('json', PickerFilterSchema, {
        history: { enabled: true, players: [] }
      }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should reject a malformed history player key`
      .value(schemaTest('json', PickerFilterSchema, {
        history: { enabled: true, players: ['x:1'] }
      }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should accept a complete search body`
      .value(schemaTest('json', PickerSearchSchema, {
        filter: {
          players: { min: 2 },
          history: {
            enabled: true,
            players: ['u:1'],
            from: '2025-01-01',
            mode: 'include'
          }
        },
        excludeGameId: 14
      }, validateZod))
      .isObject()
      .eq($.filter.players.min, 2)
      .eq($.filter.history.mode, 'include')
      .eq($.excludeGameId, 14);

    await $check`should reject a non-positive exclusion`
      .value(schemaTest('json', PickerSearchSchema, {
        filter: {},
        excludeGameId: 0
      }, validateZod))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "saved Picker filters": async ({ runScope: ctx }) => {
    await $check`should accept a named filter and normalise it`
      .value(schemaTest('json', PickerFilterSaveSchema, {
        name: '  Friday night  ',
        filter: { players: { min: 2, max: 2 } }
      }, validateZod))
      .isObject()
      .eq($.name, 'Friday night')
      .eq($.filter.version, 1)
      .eq($.filter.history.enabled, false);

    await $check`should reject an empty name`
      .value(schemaTest('json', PickerFilterSaveSchema, {
        name: '   ',
        filter: {}
      }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should reject a name longer than 60 characters`
      .value(schemaTest('json', PickerFilterSaveSchema, {
        name: 'x'.repeat(61),
        filter: {}
      }, validateZod))
      .isResponseWithStatus($, 400);

    const oversized = Array.from({ length: 700 }, (_, index) => `u:${1000 + index}`);

    await $check`should reject a serialized filter over 4 KB`
      .value(schemaTest('json', PickerFilterSaveSchema, {
        name: 'Too big',
        filter: { history: { enabled: true, players: oversized } }
      }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should allow a partial update`
      .value(schemaTest('json', PickerFilterUpdateSchema, {
        name: 'Renamed'
      }, validateZod))
      .isObject()
      .eq($.name, 'Renamed');

    await $check`should reject an empty update`
      .value(schemaTest('json', PickerFilterUpdateSchema, { }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should parse a positive filter id`
      .value(schemaTest('param', PickerFilterIdSchema, {
        filterId: '12'
      }, validateZod))
      .isObject()
      .eq($.filterId, 12);

    await $check`should reject a zero filter id`
      .value(schemaTest('param', PickerFilterIdSchema, {
        filterId: '0'
      }, validateZod))
      .isResponseWithStatus($, 400);
  }
});
