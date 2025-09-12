import { Collection, $check, $ } from "@axel669/aegis";
import { schemaTest } from "@odatnurd/cf-requests/aegis";
import { validateZod } from '#legacyvalidator';

import {
  WishlistContentsIDSchema,
  WishlistAddGameSchema,
  WishlistRemoveGameSchema,
  WishlistCreateSchema,
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
      .value(schemaTest('json', WishlistCreateSchema, { name: 'My Wishlist', slug: 'my-wishlist' }, validateZod))
      .isObject()
      .eq($.name, 'My Wishlist')
      .eq($.slug, 'my-wishlist');

    await $check`should fail if name is missing`
        .value(schemaTest('json', WishlistCreateSchema, { slug: 'my-wishlist' }, validateZod))
        .isResponseWithStatus($, 400);

    await $check`should fail if slug is missing`
        .value(schemaTest('json', WishlistCreateSchema, { name: 'My Wishlist' }, validateZod))
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
