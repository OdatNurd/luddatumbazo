import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validateZod } from '#legacyvalidator';

import {
  BGGGameIDSchema,
  OptionalBGGGameIDSchema
} from "#schema/bgg";


/******************************************************************************/


/** Implement some checks for each of the schemas related to the bgg api.
 *
 * Each schema gets its own section for clarity, with test names that outline
 * what is being tested. An attempt at care is taken here to exercise that the
 * schema works and not that the schema validation tool actually works, since
 * that is outside ofour scope. */
export default Collection`BGG Schema Validation`({
  "BGGGameIDSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a valid numeric string`
      .value(schemaTest('param', BGGGameIDSchema, { bggId: '123' }, validateZod))
      .isObject()
      .eq($.bggId, 123);

    await $check`should fail if bggId is not a number`
      .value(schemaTest('param', BGGGameIDSchema, { bggId: 'abc' }, validateZod))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "OptionalBGGGameIDSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a valid number`
      .value(schemaTest('param', OptionalBGGGameIDSchema, { bggId: 123 }, validateZod))
      .isObject()
      .eq($.bggId, 123);

    await $check`should succeed with no bggId`
      .value(schemaTest('param', OptionalBGGGameIDSchema, {}, validateZod))
      .isObject()
      .eq($.bggId, undefined);

    await $check`should fail if bggId is not a number`
      .value(schemaTest('param', OptionalBGGGameIDSchema, { bggId: 'abc' }, validateZod))
      .isResponseWithStatus($, 400);
  },
});


/******************************************************************************/
