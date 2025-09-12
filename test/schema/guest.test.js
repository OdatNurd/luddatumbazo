import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validateZod } from '#legacyvalidator';

import {
  NewGuestSchema
} from "#schema/guest";


/******************************************************************************/


/** Implement some checks for each of the schemas related to guest players.
 *
 * Each schema gets its own section for clarity, with test names that outline
 * what is being tested. An attempt at care is taken here to exercise that the
 * schema works and not that the schema validation tool actually works, since
 * that is outside ofour scope. */
export default Collection`Guest Schema Validation`({
  "NewGuestSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with valid data`
      .value(schemaTest('json', NewGuestSchema, [{ firstName: 'John', lastName: 'Doe' }], validateZod))
      .isArray()
      .eq($[0].firstName, 'John')
      .eq($[0].lastName, 'Doe')
      .eq($[0].displayName, 'John D.');

    await $check`should succeed with displayName`
      .value(schemaTest('json', NewGuestSchema, [{ firstName: 'John', lastName: 'Doe', displayName: 'JD' }], validateZod))
      .isArray()
      .eq($[0].displayName, 'JD');

    await $check`should fail if firstName is missing`
      .value(schemaTest('json', NewGuestSchema, [{ lastName: 'Doe' }], validateZod))
      .isResponseWithStatus($, 400);

    await $check`should fail if lastName is missing`
      .value(schemaTest('json', NewGuestSchema, [{ firstName: 'John' }], validateZod))
      .isResponseWithStatus($, 400);
  },
});


/******************************************************************************/
