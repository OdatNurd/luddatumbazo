/******************************************************************************/


import { writable } from 'svelte/store';
import { api } from '$api';


/******************************************************************************/


/* Create a custom readable wishlist store which contains information on the
 * wishlists that are defined for a specific household so that components
 * everywhere can access it without having to do a fetch.
 *
 * The store has a single extra init() method that populates the actual wishlist
 * data by asking the API for information on all wishlists in a given
 * household */
function createWishlistStore() {
    const { subscribe, set } = writable([]);

    // Perform a back end query to determine who the current user is, and use
    // that to set the value of the current user.
    async function init(household) {
        // Fetch information on all of the wishlists in the provided household
        // and set it into the store.
        const rawData = await api.household.wishlist.lists.list(household);
        set(rawData.map(e => ({ label: e.name, value: e.slug})));
    }

    return { subscribe, init }
}


/******************************************************************************/


/* Create the store object for others to consume. */
export const wishlists = createWishlistStore();


/******************************************************************************/