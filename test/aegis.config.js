/******************************************************************************/


import { addCheck } from '@axel669/aegis';
import { initializeCustomChecks, aegisSetup, aegisTeardown } from "@odatnurd/cf-aegis";
import { initializeD1Checks } from "@odatnurd/d1-query/aegis";
import { initializeRequestChecks } from "@odatnurd/cf-requests/aegis";
import { validate } from '../service/src/requests/common.js';


/******************************************************************************/


// Initialize custom Aegis checks for this test suite.
initializeCustomChecks();
initializeD1Checks();
initializeRequestChecks();


/******************************************************************************/


export const config = {
  files: [
    "test/schema/asset.test.js",
    "test/schema/bgg.test.js",
    "test/schema/collection.test.js",
    "test/schema/game.test.js",
    "test/schema/guest.test.js",
    "test/schema/household.test.js",
    "test/schema/session.test.js",
    "test/schema/user.test.js",
    "test/schema/wishlist.test.js",
  ],
  hooks: {
    setup: async (ctx) => aegisSetup(ctx),
    teardown: async (ctx) => aegisTeardown(ctx),
  },

  // Can be set to "afterSection" or "afterCollection" to have the test suite
  // exit as soon as a check fails in a section or collection. Default of
  // "ignore" runs all tests without stopping on failures.
  failAction: "afterSection",
}


/******************************************************************************/
