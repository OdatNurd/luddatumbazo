/******************************************************************************/


import { writable } from 'svelte/store';
import { api } from '$lib/fetch';


/******************************************************************************/


/* Create a custom readable userData store which contains information on the
 * currently logged in user, so that components everywhere can access it without
 * having to do a fetch.
 *
 * The store has a single extra init() method that populates the actual user
 * data by asking the API for information on who the current user is. */
function createUserStore() {
    const { subscribe, set } = writable({});

    // Perform a back end query to determine who the current user is, and use
    // that to set the value of the current user.
    async function init() {
        // Fetch information on the current user and then set it into the store.
        const userInfo = await api.get('/user/current');
        set(userInfo);
    }

    return { subscribe, init }
}


/******************************************************************************/


/* Create the store object for others to consume. */
export const user = createUserStore();


/******************************************************************************/