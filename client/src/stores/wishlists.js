/******************************************************************************/


import { writable } from 'svelte/store';
import { api } from '$api';


/******************************************************************************/


/* Create a custom readable wishlist store which contains information on the
 * wishlists that are defined for a specific household so that components
 * everywhere can access it without having to do a fetch.
 *
 * Each entry keeps the label/value pair that the existing selects expect, plus
 * the identity, default flag and current game count that the management page
 * needs. The store has a single init() method that fetches the lists and
 * replaces the current value; calling it again refreshes the counts. */
function createWishlistStore() {
    const { subscribe, set } = writable([]);

    // Fetch information on all of the wishlists in the provided household and
    // set it into the store. A missing household clears the store instead of
    // asking the API for a list that cannot exist.
    async function init(household) {
        if (household === null || household === undefined) {
            set([]);
            return [];
        }

        // Fetch information on all of the wishlists in the provided household
        // and set it into the store.
        const rawData = await api.household.wishlist.lists.list(household);
        const entries = rawData.map(entry => ({
            label: entry.name,
            value: entry.slug,
            id: entry.id,
            name: entry.name,
            slug: entry.slug,
            isRoot: entry.isRoot === true,
            gameCount: Number(entry.gameCount ?? 0)
        }));

        set(entries);
        return entries;
    }

    return { subscribe, init }
}


/******************************************************************************/


/* Create the store object for others to consume. */
export const wishlists = createWishlistStore();


/******************************************************************************/
