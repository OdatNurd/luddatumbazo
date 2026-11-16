import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validateZod } from '#legacyvalidator';

import {
  StorageBulkLocationSchema,
  StorageContentsIDSchema,
  StorageCreateSchema,
  StorageShelfSchema,
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


  /****************************************************************************/


  "StorageBulkLocationSchema": async () => {
    await $check`should accept games and a target location`
      .value(schemaTest('json', StorageBulkLocationSchema, {
        gameIds: [12, 18, 12],
        storageLocationId: 4
      }, validateZod))
      .isObject()
      .isArray($.gameIds)
      .eq($.gameIds.length, 2)
      .eq($.gameIds[0], 12)
      .eq($.gameIds[1], 18)
      .eq($.storageLocationId, 4);

    await $check`should coerce string identifiers and a string location`
      .value(schemaTest('json', StorageBulkLocationSchema, {
        gameIds: ['12', '18'],
        storageLocationId: '4'
      }, validateZod))
      .isObject()
      .eq($.gameIds[0], 12)
      .eq($.storageLocationId, 4);

    await $check`should reject an empty selection`
      .value(schemaTest('json', StorageBulkLocationSchema, {
        gameIds: [],
        storageLocationId: 4
      }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should reject a missing target location`
      .value(schemaTest('json', StorageBulkLocationSchema, {
        gameIds: [12]
      }, validateZod))
      .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "StorageShelfSchema": async () => {
    await $check`should accept game ids and a shelf state`
      .value(schemaTest('json', StorageShelfSchema, {
        gameIds: [12, 18, 12],
        isOnShelf: true
      }, validateZod))
      .isObject()
      .isArray($.gameIds)
      .eq($.gameIds.length, 2)
      .eq($.gameIds[0], 12)
      .eq($.gameIds[1], 18)
      .eq($.isOnShelf, true);

    await $check`should coerce row keys reported as strings`
      .value(schemaTest('json', StorageShelfSchema, {
        gameIds: ['12', '18'],
        isOnShelf: false
      }, validateZod))
      .isObject()
      .isArray($.gameIds)
      .eq($.gameIds[0], 12)
      .eq($.gameIds[1], 18);

    await $check`should reject an empty selection`
      .value(schemaTest('json', StorageShelfSchema, {
        gameIds: [],
        isOnShelf: false
      }, validateZod))
      .isResponseWithStatus($, 400);

    await $check`should reject a missing shelf state`
      .value(schemaTest('json', StorageShelfSchema, {
        gameIds: [12]
      }, validateZod))
      .isResponseWithStatus($, 400);
  },
});


/******************************************************************************/
