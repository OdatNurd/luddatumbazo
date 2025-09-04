import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validate } from "../../service/src/requests/common.js"

import {
  GameIDSchema,
  GameLookupIDSchema,
  GameLookupHouseholdSchema,
  BGGGameIDListSchema,
  GameLookupIDListSchema,
  GameLookupParamSchema,
  GameMetadataSchema,
  GameExpansionSchema,
  NewGameSchema,
  ExpansionUpdateSchema,
  MetadataTypeSelectSchema,
  MetadataQuerySchema,
  MetaDataQueryParamsSchema
} from "#schema/game";


/******************************************************************************/


/** Implement some checks for each of the schemas related to games.
 *
 * Each schema gets its own section for clarity, with test names that outline
 * what is being tested. An attempt at care is taken here to exercise that the
 * schema works and not that the schema validation tool actually works, since
 * that is outside ofour scope. */
export default Collection`Game Schema Validation`({
  "GameIDSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a valid numeric string`
      .value(schemaTest('param', GameIDSchema, { gameId: '123' }, validate))
      .isObject()
      .eq($.gameId, 123);

    await $check`should fail if gameId is not a number`
      .value(schemaTest('param', GameIDSchema, { gameId: 'abc' }, validate))
      .isResponseWithStatus($, 400);

    await $check`should mask fields not in the schema`
      .value(schemaTest('param', GameIDSchema, { gameId: '123', masked: true }, validate))
      .keyCount($, 1);
  },


  /****************************************************************************/


  "GameLookupIDSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a numeric string`
      .value(schemaTest('param', GameLookupIDSchema, { idOrSlug: '123' }, validate))
      .isObject()
      .eq($.idOrSlug, 123);

    await $check`should succeed with a string slug`
      .value(schemaTest('param', GameLookupIDSchema, { idOrSlug: 'a-slug' }, validate))
      .isObject()
      .eq($.idOrSlug, 'a-slug');

    await $check`should fail if idOrSlug is missing`
      .value(schemaTest('param', GameLookupIDSchema, { }, validate))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "GameLookupHouseholdSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a numeric string`
      .value(schemaTest('query', GameLookupHouseholdSchema, { household: '123' }, validate))
      .isObject()
      .eq($.household, 123);

    await $check`should succeed with a string slug`
      .value(schemaTest('query', GameLookupHouseholdSchema, { household: 'a-slug' }, validate))
      .isObject()
      .eq($.household, 'a-slug');

    await $check`should succeed when household is optional`
      .value(schemaTest('query', GameLookupHouseholdSchema, {}, validate))
      .isObject()
      .eq($.household, undefined);
  },


  /****************************************************************************/


  "BGGGameIDListSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with an array of numbers`
      .value(schemaTest('json', BGGGameIDListSchema, [1, 2, 3], validate))
      .isArray()
      .eq($.length, 3);

    await $check`should fail with an array of strings`
      .value(schemaTest('json', BGGGameIDListSchema, ['1', '2'], validate))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "GameLookupIDListSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with an array of numbers and strings`
      .value(schemaTest('json', GameLookupIDListSchema, [123, 'a-slug'], validate))
      .isArray()
      .eq($[0], 123)
      .eq($[1], 'a-slug');
  },


  /****************************************************************************/


  "GameLookupParamSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a valid imageType`
      .value(schemaTest('query', GameLookupParamSchema, { imageType: 'thumbnail' }, validate))
      .isObject()
      .eq($.imageType, 'thumbnail');

    await $check`should succeed with no imageType`
      .value(schemaTest('query', GameLookupParamSchema, {}, validate))
      .isObject()
      .eq($.imageType, undefined);

    await $check`should fail with an invalid imageType`
      .value(schemaTest('query', GameLookupParamSchema, { imageType: 'invalid' }, validate))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "GameMetadataSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with just name`
      .value(schemaTest('json', GameMetadataSchema, [{ name: 'Test Name' }], validate))
      .isArray()
      .eq($[0].name, 'Test Name')
      .eq($[0].slug, 'test-name')
      .eq($[0].bggId, 0);

    await $check`should succeed with all fields`
      .value(schemaTest('json', GameMetadataSchema, [{ name: 'Test Name', slug: 'provided-slug', bggId: 123 }], validate))
      .isArray()
      .eq($[0].slug, 'provided-slug');

    await $check`should fail if name is missing`
      .value(schemaTest('json', GameMetadataSchema, [{ slug: 'a-slug' }], validate))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "GameExpansionSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with bggId`
      .value(schemaTest('json', GameExpansionSchema, [{ isExpansion: true, name: 'expansion', bggId: 123 }], validate))
      .isArray();

    await $check`should succeed with gameId`
      .value(schemaTest('json', GameExpansionSchema, [{ isExpansion: true, name: 'expansion', gameId: 456 }], validate))
      .isArray();

    await $check`should fail with neither bggId nor gameId`
      .value(schemaTest('json', GameExpansionSchema, [{ isExpansion: true, name: 'expansion' }], validate))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "NewGameSchema": async ({ runScope: ctx }) => {
    const validGame = {
      name: ['Test Game'],
      slug: 'test-game',
      description: 'A game for testing',
      published: 2025
    };

    await $check`should succeed with minimal valid data`
      .value(schemaTest('json', NewGameSchema, validGame, validate))
      .isObject()
      .eq($.bggId, 0)
      .eq($.minPlayers, 1);

    await $check`should fail if name is an empty array`
      .value(schemaTest('json', NewGameSchema, { ...validGame, name: [] }, validate))
      .isResponseWithStatus($, 400);

    await $check`should fail if slug is missing`
      .value(schemaTest('json', NewGameSchema, { name: ['G'], description: 'D', published: 2025 }, validate))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "ExpansionUpdateSchema": async ({ runScope: ctx }) => {
    const validUpdate = {
      gameId: 1,
      expansions: [{ isExpansion: true, name: 'expansion', bggId: 123 }]
    };

    await $check`should succeed with valid data`
      .value(schemaTest('json', ExpansionUpdateSchema, validUpdate, validate))
      .isObject()
      .eq($.gameId, 1)
      .eq($.bggId, 0);

    await $check`should fail if gameId is missing`
      .value(schemaTest('json', ExpansionUpdateSchema, { expansions: [] }, validate))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "MetadataTypeSelectSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a valid metaType`
      .value(schemaTest('param', MetadataTypeSelectSchema, { metaType: 'designer' }, validate))
      .isObject()
      .eq($.metaType, 'designer');

    await $check`should fail with an invalid metaType`
      .value(schemaTest('param', MetadataTypeSelectSchema, { metaType: 'invalid' }, validate))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "MetadataQuerySchema": async ({ runScope: ctx }) => {
    await $check`should succeed with valid data`
      .value(schemaTest('param', MetadataQuerySchema, { metaType: 'publisher', idOrSlug: '123' }, validate))
      .isObject()
      .eq($.metaType, 'publisher')
      .eq($.idOrSlug, 123);

    await $check`should fail if metaType is missing`
        .value(schemaTest('param', MetadataQuerySchema, { idOrSlug: '123' }, validate))
        .isResponseWithStatus($, 400);

    await $check`should fail if idOrSlug is missing`
        .value(schemaTest('param', MetadataQuerySchema, { metaType: 'publisher' }, validate))
        .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "MetaDataQueryParamsSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with games param`
      .value(schemaTest('query', MetaDataQueryParamsSchema, { games: 'true' }, validate))
      .isObject()
      .eq($.games, true);

    await $check`should succeed without games param`
      .value(schemaTest('query', MetaDataQueryParamsSchema, {}, validate))
      .isObject()
      .eq($.games, false);
  },
});


/******************************************************************************/
