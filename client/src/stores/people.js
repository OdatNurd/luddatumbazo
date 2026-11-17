/******************************************************************************/


import { writable } from 'svelte/store';
import { api } from '$api';


/******************************************************************************/


/* Create a store that holds the people who can take part in a session report:
 * the users with accounts and the known guests. These lists change rarely, so
 * they are loaded once and shared instead of being fetched every time a dialog
 * opens.
 *
 * init() and ensure() load only when there is no successful load yet. refresh()
 * always refetches; use it after an operation (such as creating a session with
 * new guests) that may have added people. A failed load is recorded in error
 * and can be retried with ensure() or refresh(). */
function createPeopleStore() {
  const { subscribe, set } = writable({
    users: [],
    guests: [],
    loaded: false,
    loading: false,
    error: null,
    lastLoaded: null
  });

  let inFlight = null;
  let loaded = false;

  const load = async () => {
    loaded = false;
    set({ users: [], guests: [], loaded: false, loading: true, error: null, lastLoaded: null });

    try {
      const [users, guests] = await Promise.all([
        api.user.list(),
        api.guest.list()
      ]);

      loaded = true;
      set({
        users,
        guests,
        loaded: true,
        loading: false,
        error: null,
        lastLoaded: new Date()
      });
    }
    catch (error) {
      loaded = false;
      set({
        users: [],
        guests: [],
        loaded: false,
        loading: false,
        error: error.message ?? 'unable to load the people lists',
        lastLoaded: null
      });
      throw error;
    }
  };

  const ensure = () => {
    if (loaded === true) {
      return Promise.resolve();
    }

    if (inFlight !== null) {
      return inFlight;
    }

    inFlight = load().finally(() => {
      inFlight = null;
    });

    return inFlight;
  };

  const refresh = () => {
    if (inFlight !== null) {
      return inFlight;
    }

    inFlight = load().finally(() => {
      inFlight = null;
    });

    return inFlight;
  };

  return { subscribe, init: ensure, ensure, refresh };
}


/******************************************************************************/


/* Create the store object for others to consume. */
export const people = createPeopleStore();


/******************************************************************************/
