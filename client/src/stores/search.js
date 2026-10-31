/******************************************************************************/


import { writable } from 'svelte/store';

import { api } from '$api';


/******************************************************************************/


/* The global search index used by the header search control.
 *
 * The search covers games and the five game metadata types (categories,
 * mechanics, designers, artists and publishers); session reports are
 * deliberately not indexed, since that list grows without bound and is heading
 * toward server side pagination.
 *
 * The datasets are small and are already fetched in full by their respective
 * grid pages, so the index gathers them on first use, caches them, and answers
 * queries by filtering in memory. A successful local mutation invalidates the
 * cache so the next search sees the new record. */


/******************************************************************************/


/* The sections that search results are grouped into, in display order. Each
 * names the data key it reads, the label shown on its result header and the
 * maximum number of rows to show for that section. */
const sections = [
  { key: 'games',     label: 'Games',      limit: 7 },
  { key: 'category',  label: 'Categories', limit: 5 },
  { key: 'mechanic',  label: 'Mechanics',  limit: 5 },
  { key: 'designer',  label: 'Designers',  limit: 5 },
  { key: 'artist',    label: 'Artists',    limit: 5 },
  { key: 'publisher', label: 'Publishers', limit: 5 },
];

/* The metadata types to gather, matching the keys of the section table. */
const metaTypes = ['category', 'mechanic', 'designer', 'artist', 'publisher'];


/******************************************************************************/


/* The cached index; null until the first query has loaded it. The in flight
 * load promise is kept so that concurrent first queries share one round of
 * fetches. */
let index = null;
let loading = null;

/* Incremented whenever the cached index is discarded. An in-flight build from
 * before the invalidation must not put its now-stale result back into the
 * cache. */
let generation = 0;

/* A notification for consumers that hold their own query/options cache (the
 * combobox does), so they can force a fresh request after an invalidation. */
export const searchRevision = writable(0);


/* Discard the cached index after a local mutation. The next search rebuilds
 * it; the revision update also tells the search control to re-run its data
 * source instead of reusing the options for the last query. */
export function invalidateSearch() {
  generation += 1;
  index = null;
  loading = null;
  searchRevision.update(value => value + 1);
}


/******************************************************************************/


/* Gather every indexed list once and shape it into searchable entries of
 * { name, href } pairs. */
async function buildIndex() {
  const [games, ...metas] = await Promise.all([
    api.game.list(),
    ...metaTypes.map(type => api.metadata.list(type))
  ]);

  const entry = (name, href) => ({ name, href });

  return {
    games: games.map(game => entry(game.name, `/game/${game.slug}`)),

    ...Object.fromEntries(metaTypes.map((type, offset) => [
      type,
      metas[offset].map(item => entry(item.name, `/${type}/${item.slug}`))
    ]))
  };
}


/* Load (or return the cached) index. */
async function ensureIndex() {
  if (index !== null) {
    return index;
  }

  // A build in progress for a previous generation is allowed to settle for
  // its callers, but it must not repopulate the cache after an invalidation.
  const requested = generation;

  loading ??= buildIndex()
    .then(built => {
      if (requested === generation) {
        index = built;
      }
      return built;
    })
    .finally(() => {
      if (requested === generation) {
        loading = null;
      }
    });

  return await loading;
}


/******************************************************************************/


/* Rank how well an entry name matches a lower case query.
 *
 * 0: the name starts with the query
 * 1: some word inside the name starts with the query
 * 2: the name merely contains the query
 * -1: no match at all
 *
 * Matches are sorted by rank so the most convincing hits come first. */
function rankOf(query, name) {
  const target = name.toLowerCase();

  if (target.startsWith(query)) {
    return 0;
  }

  if (target.split(/[\s,:'()\-/]+/).some(word => word.startsWith(query))) {
    return 1;
  }

  return (target.includes(query)) ? 2 : -1;
}


/******************************************************************************/


/* Search the index for the given query.
 *
 * The result is a list of sections (in display order, skipping those with no
 * matches); each section carries its total match count and its top ranked
 * matches, capped by the section's row limit. Each match knows the route to
 * navigate to when it is picked.
 *
 * The optional abort signal is honoured after the index load so that a
 * superseded query does no further work. */
export async function search(query, signal = undefined) {
  const data = await ensureIndex();

  if (signal?.aborted === true) {
    return [];
  }

  const needle = query.trim().toLowerCase();
  if (needle === '') {
    return [];
  }

  return sections.map(section => {
    const matches = data[section.key]
      .map(item => ({ ...item, rank: rankOf(needle, item.name) }))
      .filter(item => item.rank >= 0)
      .sort((a, b) => (a.rank - b.rank) || a.name.localeCompare(b.name));

    return {
      key: section.key,
      label: section.label,
      count: matches.length,
      matches: matches.slice(0, section.limit)
    };
  }).filter(section => section.count > 0);
}


/******************************************************************************/
