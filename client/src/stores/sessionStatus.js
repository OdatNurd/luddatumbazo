/******************************************************************************/


import { writable } from 'svelte/store';
import { api } from '$api';


/******************************************************************************/


/* Create a store that holds the session counts used by the profile menu and
 * open-session view.
 *
 * The status is advisory: a failed request must never prevent the application
 * from starting or hide the profile shortcut. `init()` therefore records a
 * failure and resolves; the profile treats a non-loaded store as fail-open.
 *
 * init() loads once after a successful request. refresh() always starts a new
 * request (unless one is already in flight) after a create or update. */
function createSessionStatusStore() {
  const { subscribe, set } = writable({
    loaded: false,
    loading: false,
    error: null,
    data: null
  });

  let inFlight = null;
  let loaded = false;

  const load = async () => {
    loaded = false;
    set({ loaded: false, loading: true, error: null, data: null });

    try {
      const data = await api.session.status();

      loaded = true;
      set({ loaded: true, loading: false, error: null, data });
    }
    catch (error) {
      loaded = false;
      set({
        loaded: false,
        loading: false,
        error: error.message ?? 'unable to load session status',
        data: null
      });
    }
  };

  const request = () => {
    if (inFlight !== null) {
      return inFlight;
    }

    inFlight = load().finally(() => {
      inFlight = null;
    });

    return inFlight;
  };

  const init = () => {
    if (loaded === true) {
      return Promise.resolve();
    }

    return request();
  };

  const refresh = () => request();

  return { subscribe, init, refresh };
}


/******************************************************************************/


/* Create the store object for others to consume. */
export const sessionStatus = createSessionStatusStore();


/******************************************************************************/
