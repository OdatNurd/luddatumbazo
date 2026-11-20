import { Collection, $check, $ } from "@axel669/aegis";
import { execSQLFiles } from "@odatnurd/d1-query/aegis";

import { dbPickerSearch, dbUserPrimaryHousehold } from '#db/insights';


/******************************************************************************/


const baseFilter = () => ({
  version: 1,
  players: {},
  time: { mode: 'overlap' },
  complexity: {},
  categories: [],
  mechanics: [],
  history: { enabled: false, players: [], mode: 'exclude' }
});

const makeFilter = (overrides = {}) => ({
  ...baseFilter(),
  ...overrides,
  history: { ...baseFilter().history, ...(overrides.history ?? {}) }
});

const ids = result => result.matches.map(game => game.id).sort((left, right) => left - right);


/******************************************************************************/


export default Collection`Game Picker`({
  "owned base games": async ({ runScope: ctx }) => {
    await execSQLFiles(ctx.env.DB, 'test/db/picker-setup.sql');

    const all = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter()
    });

    await $check`should return every owned base game`
      .value(all)
      .isObject()
      .eq($.total, 9)
      .eq($.onlyMatch, false);

    await $check`should exclude pure local expansions, BGG-only expansions, and unowned games`
      .value(ids(all))
      .isArray($)
      .eq($.includes(106), false)
      .eq($.includes(107), false)
      .eq($.includes(110), false);

    await $check`should keep a game that is both a base and an expansion`
      .value(ids(all))
      .isArray($)
      .eq($.includes(109), true);

    await $check`should draw the pick from the match pool`
      .value(all.picked)
      .isObject();

    await $check`should not leak another household's collection`
      .value(await dbPickerSearch(ctx, { householdId: 11, filter: makeFilter() }))
      .isObject()
      .eq($.total, 1)
      .eq($.matches[0].id, 100);

    await $check`should return an empty pool for a user with no household`
      .value(await dbPickerSearch(ctx, { householdId: null, filter: makeFilter() }))
      .isObject()
      .eq($.total, 0)
      .eq($.picked, null);

    await $check`should find the primary household`
      .value(await dbUserPrimaryHousehold(ctx, 1))
      .eq($, 10);
  },


  /****************************************************************************/


  "numeric filters": async ({ runScope: ctx }) => {
    await execSQLFiles(ctx.env.DB, 'test/db/picker-setup.sql');

    const threePlayers = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({ players: { min: 3 } })
    });

    await $check`should match a game whose player range overlaps the request`
      .value(ids(threePlayers))
      .isArray($)
      .eq($.includes(100), true)
      .eq($.includes(103), true)
      .eq($.includes(108), true)
      .eq($.includes(111), false);

    const exactTwo = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({ players: { min: 2, max: 2 } })
    });

    await $check`should accept a game that supports exactly two players`
      .value(ids(exactTwo))
      .isArray($)
      .eq($.includes(111), true)
      .eq($.length, 9);

    const window = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({ time: { min: 30, max: 90, mode: 'overlap' } })
    });

    await $check`should overlap the play-time window`
      .value(ids(window))
      .isArray($)
      .eq($.includes(100), true)
      .eq($.includes(108), true)
      .eq($.includes(105), false)
      .eq($.includes(111), false)
      .eq($.length, 7);

    const weight = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({ complexity: { min: 2.0, max: 2.5 } })
    });

    await $check`should bound complexity inclusively`
      .value(ids(weight))
      .isArray($)
      .eq($.length, 4)
      .eq($.includes(100), true)
      .eq($.includes(109), true)
      .eq($.includes(111), false);
  },


  /****************************************************************************/


  "metadata filters": async ({ runScope: ctx }) => {
    await execSQLFiles(ctx.env.DB, 'test/db/picker-setup.sql');

    const animals = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({ categories: ['animals'] })
    });

    await $check`should match any selected category`
      .value(ids(animals))
      .isArray($)
      .eq($.length, 5)
      .eq($.includes(100), true)
      .eq($.includes(109), true);

    const drafting = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({ mechanics: ['open-drafting'] })
    });

    await $check`should match a selected mechanic`
      .value(ids(drafting))
      .isArray($)
      .eq($.length, 2)
      .eq($.includes(100), true)
      .eq($.includes(101), true);

    const both = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({ categories: ['animals'], mechanics: ['open-drafting'] })
    });

    await $check`should require categories and mechanics together`
      .value(ids(both))
      .isArray($)
      .eq($.length, 2)
      .eq($.includes(100), true)
      .eq($.includes(101), true)
      .eq($.includes(102), false);

    const orWithin = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({ categories: ['animals', 'puzzle'] })
    });

    await $check`should OR the values within one metadata field`
      .value(ids(orWithin))
      .isArray($)
      .eq($.length, 6)
      .eq($.includes(104), true);

    const none = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({ categories: ['does-not-exist'] })
    });

    await $check`should return no pick when nothing matches`
      .value(none)
      .isObject()
      .eq($.total, 0)
      .eq($.picked, null);
  },


  /****************************************************************************/


  "history": async ({ runScope: ctx }) => {
    await execSQLFiles(ctx.env.DB, 'test/db/picker-setup.sql');

    const fresh = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({
        history: { enabled: true, players: ['u:1'], from: '2024-12-01T00:00:00.000Z', mode: 'exclude' }
      })
    });

    await $check`should remove games the selected person played in the period`
      .value(ids(fresh))
      .isArray($)
      .eq($.includes(100), false)
      .eq($.includes(101), true)
      .eq($.length, 8);

    const played = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({
        history: { enabled: true, players: ['u:1'], from: '2024-12-01T00:00:00.000Z', mode: 'include' }
      })
    });

    await $check`should count learning sessions as played`
      .value(played)
      .isObject()
      .eq($.total, 1)
      .eq($.onlyMatch, true)
      .eq($.picked.id, 100);

    const old = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({
        history: { enabled: true, players: ['u:1'], from: '2024-01-01T00:00:00.000Z', mode: 'exclude' }
      })
    });

    await $check`should include sessions inside the requested period`
      .value(ids(old))
      .isArray($)
      .eq($.includes(101), false)
      .eq($.includes(102), true);

    const partner = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({
        history: { enabled: true, players: ['u:2'], from: '2024-12-01T00:00:00.000Z', mode: 'include' }
      })
    });

    await $check`should scope history to the selected people, not the household`
      .value(partner)
      .isObject()
      .eq($.total, 1)
      .eq($.picked.id, 102);

    const guest = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({
        history: { enabled: true, players: ['g:50'], from: '2024-12-01T00:00:00.000Z', mode: 'include' }
      })
    });

    await $check`should treat a guest as its own history identity`
      .value(guest)
      .isObject()
      .eq($.total, 1)
      .eq($.picked.id, 104);
  },


  /****************************************************************************/


  "redraw": async ({ runScope: ctx }) => {
    await execSQLFiles(ctx.env.DB, 'test/db/picker-setup.sql');

    const all = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter()
    });

    const again = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter(),
      excludeGameId: all.picked.id
    });

    await $check`should not return the excluded game when another match exists`
      .value(all.picked.id === again.picked.id)
      .eq($, false);

    const single = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({ categories: ['puzzle'] })
    });

    const solo = await dbPickerSearch(ctx, {
      householdId: 10,
      filter: makeFilter({ categories: ['puzzle'] }),
      excludeGameId: 104
    });

    await $check`should return the only match again and flag it`
      .value(single)
      .isObject()
      .eq($.total, 1)
      .eq($.onlyMatch, true);

    await $check`should not pretend there was a choice for the only match`
      .value(solo)
      .isObject()
      .eq($.total, 1)
      .eq($.onlyMatch, true)
      .eq($.picked.id, 104);
  }
});
