import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validateZod } from '#legacyvalidator';

import {
  CollectionAddGameSchema,
  CollectionRemoveGameSchema
} from "#schema/collection";


/******************************************************************************/


/** Implement some checks for each of the schemas related to game collections.
 *
 * Each schema gets its own section for clarity, with test names that outline
 * what is being tested. An attempt at care is taken here to exercise that the
 * schema works and not that the schema validation tool actually works, since
 * that is outside ofour scope. */
export default Collection`Collection Schema Validation`({
  "CollectionAddGameSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with valid data`
      .value(schemaTest('json', CollectionAddGameSchema, { game: '123', name: 'name', publisher: '456' }, validateZod))
      .isObject()
      .eq($.game, 123)
      .eq($.name, 'name')
      .eq($.publisher, 456);

    await $check`should fail if game is missing`
      .value(schemaTest('json', CollectionAddGameSchema, { name: 'name', publisher: '456' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should fail if name is missing`
      .value(schemaTest('json', CollectionAddGameSchema, { game: '123', publisher: '456' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should fail if publisher is missing`
      .value(schemaTest('json', CollectionAddGameSchema, { game: '123', name: 'name' }, validateZod))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "CollectionRemoveGameSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with valid data`
      .value(schemaTest('json', CollectionRemoveGameSchema, { game: '123' }, validateZod))
      .isObject()
      .eq($.game, 123);

    await $check`should fail if game is missing`
      .value(schemaTest('json', CollectionRemoveGameSchema, {}, validateZod))
      .isResponseWithStatus($, 400);
  },
});


/******************************************************************************/
