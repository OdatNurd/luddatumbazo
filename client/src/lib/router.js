/******************************************************************************/


import { readable } from 'svelte/store';


/******************************************************************************/


/* Parse the current location hash into a route descriptor. */
function parseHash() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [path, query] = hash.split('?');

  return {
    path: path || '/',
    params: {},
    query: Object.fromEntries(new URLSearchParams(query ?? ''))
  };
}


/******************************************************************************/


/* The current location hash, normalized the way parseHash sees it: no leading
 * hash mark, and an empty hash reads as the root route. */
function currentHash() {
  return window.location.hash.replace(/^#/, '') || '/';
}


/******************************************************************************/


/* Match a route pattern against a path, returning the extracted params when it
 * matches, or null when it does not. Patterns may be given with or without a
 * leading slash (the zephyr routes used both styles). */
export function matchRoute(pattern, path) {
  const patternParts = pattern.split('/').filter(part => part !== '');
  const pathParts = path.split('/').filter(part => part !== '');

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    }
    else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}


/******************************************************************************/


/* The current route as a readable store; pages receive its value as routeInfo.
 * Matching against the route table happens where the table is defined. */
export const route = readable(parseHash(), set => {
  const update = () => set(parseHash());

  window.addEventListener('hashchange', update);
  update();

  return () => window.removeEventListener('hashchange', update);
});


/******************************************************************************/


/* Build an href that navigates within the hash router. */
export function href(path) {
  return `#${path}`;
}


/* Navigate to a route path (without the leading hash). */
export function navigate(path) {
  window.location.hash = path;
}


/******************************************************************************/


/* The in-app navigation stack.
 *
 * The back button cannot lean on window.history.back(): the browser's history
 * also holds everything that is not ours -- the identity provider's pages from
 * a login round trip above all -- so a back press could walk straight out
 * through the auth portal. Instead the app keeps its own trail of visited
 * routes and the back button retraces that, falling back to a sensible parent
 * route when there is no trail to retrace (a cold deep link, say).
 *
 * The trail is kept in sessionStorage and is stamped with the identity of the
 * user that built it. Every login is a full page load, and initStack() runs
 * right after the app learns who is authenticated, so a trail recorded by one
 * user can never be walked by the next: a mismatch discards it outright.
 *
 * Entries hold the route text including its query (e.g. "/games?q=ark&page=3")
 * so that a return target carries the exact list state to go back to.
 *
 * Each browser history entry is stamped (via history.replaceState) with the
 * index of the stack entry it represents. Arriving on a stamped entry means
 * the user moved through the browser's own back/forward, and the stack is
 * rewound to that point; arriving on an unstamped entry is a new navigation
 * and pushes. App back retraces the stack by explicit navigation (never
 * history.back()), which costs one extra history entry -- browser back after
 * app back lands on the page just left -- but can never land anywhere but a
 * route this stack recorded. */

const STACK_KEY = 'luddatumbazo:nav-stack';
const STACK_MAX = 50;

// The recorded trail of routes, oldest first; the current route is always the
// last entry.
let stack = [];

// The identity the stack was built for.
let boundUser = '';

// Whether the stack records navigations; true only between initStack() and a
// clearStack().
let tracking = false;

// Whether the hashchange hook is installed (initStack runs once per load).
let listening = false;

const loadStack = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STACK_KEY) ?? 'null');
  }
  catch {
    return null;
  }
};

const saveStack = () => {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify({ user: boundUser, entries: stack }));
  }
  catch {
    // Storage being unavailable only means the trail does not survive the
    // page; never fatal.
  }
};

// Stamp the browser's current history entry with the index of the stack entry
// it represents, so a later arrival here (browser back/forward) reads as a
// revisit instead of a new navigation.
const tagEntry = () => {
  if (stack.length === 0) {
    return;
  }

  try {
    history.replaceState({ ludIdx: stack.length - 1 }, '');
  }
  catch {
    // Embedded contexts may forbid replaceState; without stamps every arrival
    // reads as a new navigation, which only makes the trail longer.
  }
};

const record = hash => {
  if (tracking === false) {
    return;
  }

  // An arrival on an entry we stamped (browser back or forward) rewinds the
  // trail to that point. The stamp must still name this very hash: stamps go
  // stale when the stack overflows, and a stale stamp falls through to being a
  // fresh navigation rather than truncating the trail at the wrong place.
  const stamp = history.state?.ludIdx;
  if (Number.isInteger(stamp) && stack[stamp] === hash) {
    stack.length = stamp + 1;
    saveStack();
    return;
  }

  // Anything else is a new navigation and pushes; consecutive duplicates are
  // ignored (app back retraces by navigating to the entry that is already on
  // top, and must not push it again).
  if (stack[stack.length - 1] !== hash) {
    stack.push(hash);

    if (stack.length > STACK_MAX) {
      stack.shift();
    }

    saveStack();
  }

  tagEntry();
};


/******************************************************************************/


/* Begin recording navigations for the given user, adopting the trail that a
 * previous load recorded when it belongs to the same person.
 *
 * Called once per page load, immediately after the app learns who is
 * authenticated. The identity check is the login boundary: logout, idle
 * expiry and every other path into a new session are full page loads that end
 * up here, and any trail that names a different user is discarded before
 * anyone can press back through it. */
export function initStack(userId) {
  boundUser = String(userId ?? '');
  const stored = loadStack();

  stack = (stored !== null && String(stored.user) === boundUser && Array.isArray(stored.entries))
    ? [...stored.entries]
    : [];

  tracking = true;
  record(currentHash());

  if (listening === false) {
    listening = true;
    window.addEventListener('hashchange', () => record(currentHash()));
  }
}


/* Discard the recorded trail; called on logout so that nothing is left behind
 * for whoever uses this browser next. The identity check in initStack() is
 * what actually guards the boundary -- this just leaves nothing to find. */
export function clearStack() {
  tracking = false;
  stack = [];
  boundUser = '';

  try {
    sessionStorage.removeItem(STACK_KEY);
  }
  catch {
    // Nothing to clean up when storage is unavailable.
  }
}


/* Retrace one step of the trail, or go to the given fallback route (a route
 * path, with or without the leading hash) when there is nothing to retrace. */
export function back(fallback) {
  if (stack.length >= 2) {
    stack.pop();
    saveStack();
    navigate(stack[stack.length - 1]);
  }
  else {
    navigate(String(fallback ?? '/').replace(/^#/, ''));
  }
}


/* Rewrite the current route's query in place: no new history entry, no
 * navigation, no re-render. The named keys are set from the given values, and
 * keys given an empty (or null/undefined) value are dropped, so callers can
 * always name every key they own and let empty ones clean themselves out of
 * the URL.
 *
 * The stack's top entry is this route, so it is rewritten too; the recorded
 * return target then carries the same state. */
export function replaceQuery(params) {
  const { path, query } = parseHash();
  const merged = { ...query };

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      delete merged[key];
    }
    else {
      merged[key] = String(value);
    }
  }

  const search = new URLSearchParams(merged).toString();
  const next = (search === '') ? path : `${path}?${search}`;

  if (next === currentHash()) {
    return;
  }

  if (stack.length > 0) {
    stack[stack.length - 1] = next;
    saveStack();
    history.replaceState({ ludIdx: stack.length - 1 }, '', `#${next}`);
  }
  else {
    history.replaceState(null, '', `#${next}`);
  }
}


/* The current route's query parameters as a plain object. */
export function currentQuery() {
  return parseHash().query;
}


/******************************************************************************/
