import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validateZod } from '#legacyvalidator';

import {
  WishlistContentsIDSchema,
  WishlistAddGameSchema,
  WishlistRemoveGameSchema,
  WishlistCreateSchema,
  WishlistUpdateSchema,
  WishlistDeleteSchema
} from "#schema/wishlist";


/******************************************************************************/


/** Implement some checks for each of the schemas related to wishlists.
 *
 * Each schema gets its own section for clarity, with test names that outline
 * what is being tested. An attempt at care is taken here to exercise that the
 * schema works and not that the schema validation tool actually works, since
 * that is outside ofour scope. */
export default Collection`Wishlist Schema Validation`({
  "WishlistContentsIDSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with valid data`
      .value(schemaTest('param', WishlistContentsIDSchema, { householdIdOrSlug: '123', wishlistIdOrSlug: '456' }, validateZod))
      .isObject()
      .eq($.householdIdOrSlug, 123)
      .eq($.wishlistIdOrSlug, 456);

    await $check`should fail if householdIdOrSlug is missing`
        .value(schemaTest('param', WishlistContentsIDSchema, { wishlistIdOrSlug: '456' }, validateZod))
        .isResponseWithStatus($, 400);

    await $check`should fail if wishlistIdOrSlug is missing`
        .value(schemaTest('param', WishlistContentsIDSchema, { householdIdOrSlug: '123' }, validateZod))
        .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "WishlistAddGameSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with valid data`
      .value(schemaTest('json', WishlistAddGameSchema, { game: '123', name: 'name' }, validateZod))
      .isObject()
      .eq($.game, 123)
      .eq($.name, 'name');

    await $check`should fail if game is missing`
        .value(schemaTest('json', WishlistAddGameSchema, { name: 'name' }, validateZod))
        .isResponseWithStatus($, 400);

    await $check`should fail if name is missing`
        .value(schemaTest('json', WishlistAddGameSchema, { game: '123' }, validateZod))
        .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "WishlistRemoveGameSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with valid data`
      .value(schemaTest('json', WishlistRemoveGameSchema, { game: '123' }, validateZod))
      .isObject()
      .eq($.game, 123);

    await $check`should fail if game is missing`
        .value(schemaTest('json', WishlistRemoveGameSchema, { }, validateZod))
        .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "WishlistCreateSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with valid data`
      .value(schemaTest('json', WishlistCreateSchema, { name: 'My Wishlist' }, validateZod))
      .isObject()
      .eq($.name, 'My Wishlist');

    await $check`should trim surrounding whitespace`
      .value(schemaTest('json', WishlistCreateSchema, { name: '  My Wishlist  ' }, validateZod))
      .isObject()
      .eq($.name, 'My Wishlist');

    await $check`should fail if name is missing`
        .value(schemaTest('json', WishlistCreateSchema, { }, validateZod))
        .isResponseWithStatus($, 400);

    await $check`should fail if name is blank`
        .value(schemaTest('json', WishlistCreateSchema, { name: '   ' }, validateZod))
        .isResponseWithStatus($, 400);

    await $check`should fail if name is longer than 80 characters`
        .value(schemaTest('json', WishlistCreateSchema, { name: 'x'.repeat(81) }, validateZod))
        .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "WishlistUpdateSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with an ID and a name`
      .value(schemaTest('json', WishlistUpdateSchema, { wishlist: '123', name: 'New Name' }, validateZod))
      .isObject()
      .eq($.wishlist, 123)
      .eq($.name, 'New Name');

    await $check`should accept a wishlist slug`
      .value(schemaTest('json', WishlistUpdateSchema, { wishlist: 'my-wishlist', name: 'New Name' }, validateZod))
      .isObject()
      .eq($.wishlist, 'my-wishlist');

    await $check`should trim surrounding whitespace from the name`
      .value(schemaTest('json', WishlistUpdateSchema, { wishlist: '123', name: '  New Name  ' }, validateZod))
      .isObject()
      .eq($.name, 'New Name');

    await $check`should fail if wishlist is missing`
        .value(schemaTest('json', WishlistUpdateSchema, { name: 'New Name' }, validateZod))
        .isResponseWithStatus($, 400);

    await $check`should fail if name is missing`
        .value(schemaTest('json', WishlistUpdateSchema, { wishlist: '123' }, validateZod))
        .isResponseWithStatus($, 400);

    await $check`should fail if name is blank`
        .value(schemaTest('json', WishlistUpdateSchema, { wishlist: '123', name: '   ' }, validateZod))
        .isResponseWithStatus($, 400);

    await $check`should fail if name is longer than 80 characters`
        .value(schemaTest('json', WishlistUpdateSchema, { wishlist: '123', name: 'x'.repeat(81) }, validateZod))
        .isResponseWithStatus($, 400);
  },


  /****************************************************************************/


  "WishlistDeleteSchema": async ({ runScope: ctx }) => {
    await $check`should succeed with valid data`
      .value(schemaTest('json', WishlistDeleteSchema, { wishlist: '123' }, validateZod))
      .isObject()
      .eq($.wishlist, 123);

    await $check`should fail if wishlist is missing`
        .value(schemaTest('json', WishlistDeleteSchema, { }, validateZod))
        .isResponseWithStatus($, 400);
  },
});


/******************************************************************************/
