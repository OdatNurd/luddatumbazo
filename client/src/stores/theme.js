/******************************************************************************/


import { writable } from 'svelte/store';


/******************************************************************************/


/* Theme store; the app supports the Web Awesome light and dark schemes, which
 * are applied as selector classes on the document element.
 *
 * The choice persists in localStorage so that it sticks between visits; the
 * initial value is applied early from index.html to avoid a flash of the wrong
 * scheme, and this store keeps the DOM classes in sync as it changes. */
const storageKey = 'luddatumbazo.theme';

const initial = (() => {
  try {
    return localStorage.getItem(storageKey) ?? 'dark';
  }
  catch {
    return 'dark';
  }
})();


/******************************************************************************/


/* Apply a scheme by toggling the Web Awesome scheme classes and nudging the
 * browser chrome color along with it. */
function apply(scheme) {
  const root = document.documentElement;

  root.classList.toggle('wa-dark', scheme === 'dark');
  root.classList.toggle('wa-light', scheme === 'light');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta !== null) {
    meta.content = (scheme === 'dark') ? '#12151c' : '#ffffff';
  }
}


/******************************************************************************/


function createThemeStore() {
  const { subscribe, set } = writable(initial);

  // Sync everything up front; index.html already applied the scheme classes to
  // avoid a flash, but the browser chrome color only follows along here.
  apply(initial);

  // Set a specific scheme ('light' or 'dark') and persist it.
  function select(scheme) {
    apply(scheme);
    try {
      localStorage.setItem(storageKey, scheme);
    }
    catch {
      // Storage being unavailable is not fatal; the scheme still applies.
    }
    set(scheme);
  }

  // Flip between the two schemes.
  function toggle() {
    let current = initial;
    const unsubscribe = subscribe(value => current = value);
    unsubscribe();

    select(current === 'dark' ? 'light' : 'dark');
  }

  return { subscribe, select, toggle };
}


/******************************************************************************/


/* Create the store object for others to consume. */
export const theme = createThemeStore();


/******************************************************************************/
