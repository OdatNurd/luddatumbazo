/******************************************************************************/


/* Read a boolean preference from local storage.
 *
 * Returns null when the preference has never been saved (or storage is
 * unavailable), so callers can distinguish "unset" from an explicit false. */
export function readBooleanPreference(key) {
  try {
    const stored = localStorage.getItem(key);

    if (stored === 'true') {
      return true;
    }
    if (stored === 'false') {
      return false;
    }
  }
  catch {
    // Private browsing and exhausted quotas can make storage unavailable.
  }

  return null;
}


/******************************************************************************/


/* Persist a boolean preference. Failure is not fatal; the interface still
 * works, it just will not remember the choice on the next visit. */
export function writeBooleanPreference(key, value) {
  try {
    localStorage.setItem(key, value ? 'true' : 'false');
  }
  catch {
    // The current page keeps its in-memory state even when saving fails.
  }
}


/******************************************************************************/
