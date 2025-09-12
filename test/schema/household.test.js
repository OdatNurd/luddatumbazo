import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validateZod } from '#legacyvalidator';

import {
  HouseholdCreateSchema,
  HouseholdLookupIDSchema
} from "#schema/household";


/******************************************************************************/


/** Implement some checks for each of the schemas related to user households.
 *
 * Each schema gets its own section for clarity, with test names that outline
 * what is being tested. An attempt at care is taken here to exercise that the
 * schema works and not that the schema validation tool actually works, since
 * that is outside ofour scope. */
export default Collection`Household Schema Validation`({
  "HouseholdCreateSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with valid data`
      .value(schemaTest('json', HouseholdCreateSchema, { name: 'The Martins', slug: 'the-martins' }, validateZod))
      .isObject()
      .eq($.name, 'The Martins')
      .eq($.slug, 'the-martins');

    await $check`should fail if name is missing`
      .value(schemaTest('json', HouseholdCreateSchema, { slug: 'the-martins' }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should fail if slug is missing`
      .value(schemaTest('json', HouseholdCreateSchema, { name: 'The Martins' }, validateZod))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "HouseholdLookupIDSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with a valid numeric string`
      .value(schemaTest('param', HouseholdLookupIDSchema, { householdIdOrSlug: '123' }, validateZod))
      .isObject()
      .eq($.householdIdOrSlug, 123);

    await $check`should succeed with a valid string`
      .value(schemaTest('param', HouseholdLookupIDSchema, { householdIdOrSlug: 'the-martins' }, validateZod))
      .isObject()
      .eq($.householdIdOrSlug, 'the-martins');

    await $check`should fail if householdIdOrSlug is missing`
      .value(schemaTest('param', HouseholdLookupIDSchema, {}, validateZod))
      .isResponseWithStatus($, 400);
  },
});


/******************************************************************************/
