/******************************************************************************/


import { writable } from 'svelte/store';
import { api } from '$api';


/******************************************************************************/


/* Create a custom readable userData store which contains information on the
 * server, such as its version information and the list of known game types for
 * session reports.
 *
 * The store has a single extra init() method that populates the actual server
 * data by asking the API for information on the server. */
function createServerStore() {
    const { subscribe, set } = writable({});

    // After the game types are loaded, this is populated as a lookup that maps
    // the slug to the looked up record, for faster runtime access.
    const gameTypeLookup = {};

    // Perform a back end query to determine the server info, and use that to
    // set the value of the store.
    async function init() {
        // Fetch information on the server and then set it into the store.
        const [version, gameTypes ] = await Promise.all([api.server.version(), api.session.gameTypes()]);
        set({ version, gameTypes });

        // Using the values in the gameTypes array, turn it into an object with
        // keys that are the slug and values that are the object.
        gameTypes.forEach(e => gameTypeLookup[e.slug] = e);
    }

    return {
        subscribe,
        init,
        gameTypeName: gameType => gameTypeLookup[gameType]?.name ?? 'Unknown',
        gameTypeIcon: gameType => gameTypeLookup[gameType]?.icon ?? 'question'
    }
}


/******************************************************************************/


/* Create the store object for others to consume. */
export const server = createServerStore();


/******************************************************************************/