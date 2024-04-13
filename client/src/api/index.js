/******************************************************************************/


// The "raw" core API methods that allow for directly hitting endpoints
export { api } from './fetch.js';

// Operations to add and remove games to and from the household's collection
// and wishlist.
export { apiAddGameToCollection, apiRemoveGameFromCollection,
         apiAddGameToWishlist,   apiRemoveGameFromWishlist    } from './household.js';


/******************************************************************************/
