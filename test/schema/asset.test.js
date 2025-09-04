import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validate } from "../../service/src/requests/common.js"

import {
  AssetUploadSchema,
  AssetDeleteSchema
} from "#schema/asset";


/******************************************************************************/


/** Implement some checks for each of the schemas related to game assets.
 *
 * Each schema gets its own section for clarity, with test names that outline
 * what is being tested. An attempt at care is taken here to exercise that the
 * schema works and not that the schema validation tool actually works, since
 * that is outside ofour scope. */
export default Collection`Asset Schema Validation`({
  "AssetUploadSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with valid data`
      .value(schemaTest('form', AssetUploadSchema, { file: new File([], 'test.txt'), description: 'test' }, validate))
      .isObject()
      .eq($.description, 'test');

    await $check`should fail if file is missing`
      .value(schemaTest('form', AssetUploadSchema, { description: 'test' }, validate))
      .isResponseWithStatus($, 400);

    await $check`should fail if description is missing`
      .value(schemaTest('form', AssetUploadSchema, { file: new File([], 'test.txt') }, validate))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "AssetDeleteSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a valid key`
      .value(schemaTest('json', AssetDeleteSchema, { key: 'some/key' }, validate))
      .isObject()
      .eq($.key, 'some/key');

    await $check`should fail if key is not a string`
      .value(schemaTest('json', AssetDeleteSchema, { key: 123 }, validate))
      .isResponseWithStatus($, 400);
  },
});


/******************************************************************************/
