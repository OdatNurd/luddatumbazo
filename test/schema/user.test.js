import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validateZod } from '#legacyvalidator';

import {
  UserIDSchema
} from "#schema/user";


/******************************************************************************/


/** Implement some checks for each of the schemas related to users.
 *
 * Each schema gets its own section for clarity, with test names that outline
 * what is being tested. An attempt at care is taken here to exercise that the
 * schema works and not that the schema validation tool actually works, since
 * that is outside ofour scope. */
export default Collection`User Schema Validation`({
  "UserIDSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a valid numeric string`
      .value(schemaTest('param', UserIDSchema, { userId: '123' }, validateZod))
      .isObject()
      .eq($.userId, 123);

    await $check`should fail if userId is not a number`
      .value(schemaTest('param', UserIDSchema, { userId: 'abc' }, validateZod))
      .isResponseWithStatus($, 400);
  },
});


/******************************************************************************/
