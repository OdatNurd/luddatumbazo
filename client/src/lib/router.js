/******************************************************************************/


import { readable } from 'svelte/store';


/******************************************************************************/


/* A tiny hash based router.
 *
 * Routes are declared as path patterns with :param segments (mirroring the
 * zephyr routes used previously, e.g. "/game/:slug"), and the current hash is
 * exposed as a readable store whose value looks like the zephyr routeInfo that
 * pages already expect: { path, params, query }. */


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
