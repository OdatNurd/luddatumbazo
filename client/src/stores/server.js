/******************************************************************************/


import { writable } from 'svelte/store';
import { api } from '$api';


/******************************************************************************/


/* Create a custom readable userData store which contains information on the
 * server, such as its version information.
 *
 * The store has a single extra init() method that populates the actual server
 * data by asking the API for information on the server. */
function createServerStore() {
    const { subscribe, set } = writable({});

    // Perform a back end query to determine the server info, and use that to
    // set the value of the store.
    async function init() {
        // Fetch information on the server and then set it into the store.
        const serverInfo = await api.server.version();
        set(serverInfo);
    }

    return { subscribe, init }
}


/******************************************************************************/


/* Create the store object for others to consume. */
export const server = createServerStore();


/******************************************************************************/