import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validateZod } from '#legacyvalidator';

import {
  StorageContentsIDSchema,
  StorageCreateSchema,
  StorageUpdateSchema
} from "#schema/storage";


/******************************************************************************/


/** Implement checks for the storage schemas added with the storage feature.
 *
 * These focus on the lookup contract; the database behavior is exercised by
 * the service and through the storage page. */
export default Collection`Storage Schema Validation`({
  "StorageContentsIDSchema": async () => {
    await $check`should accept a numeric location ID`
      .value(schemaTest('param', StorageContentsIDSchema, {
        householdIdOrSlug: 'the-martins',
        storageId: '12'
      }, validateZod))
      .isObject()
      .eq($.householdIdOrSlug, 'the-martins')
      .eq($.storageId, '12');

    await $check`should accept a stored location slug`
      .value(schemaTest('param', StorageContentsIDSchema, {
        householdIdOrSlug: 'the-martins',
        storageId: 'kalax-cubby-2'
      }, validateZod))
      .isObject()
      .eq($.storageId, 'kalax-cubby-2');

    await $check`should fail if the location is missing`
      .value(schemaTest('param', StorageContentsIDSchema, {
        householdIdOrSlug: 'the-martins'
      }, validateZod))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "StorageCreateSchema": async () => {
    await $check`should succeed with a name and no parent`
      .value(schemaTest('json', StorageCreateSchema, { name: 'Kallax' }, validateZod))
      .isObject()
      .eq($.name, 'Kallax')
      .eq($.parentId, undefined);

    await $check`should fail with an empty name`
      .value(schemaTest('json', StorageCreateSchema, { name: '   ' }, validateZod))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "StorageUpdateSchema": async () => {
    await $check`should succeed with an ID and name`
      .value(schemaTest('json', StorageUpdateSchema, { storageId: 12, name: 'Kallax 2' }, validateZod))
      .isObject()
      .eq($.storageId, 12)
      .eq($.name, 'Kallax 2');

    await $check`should fail without an ID`
      .value(schemaTest('json', StorageUpdateSchema, { name: 'Kallax 2' }, validateZod))
      .isResponseWithStatus($, 400);
  },
});


/******************************************************************************/
