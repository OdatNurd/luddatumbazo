/******************************************************************************/


import { api } from './fetch.js';


/******************************************************************************/


// Carry out a collection action; simple helper that bundles the appropriate
// request to the given URI and returns what it does.
async function rawAction(doInsert, URI, game, name, publisher) {
  const func = (doInsert === true) ? api.put : api.delete;
  return await func(URI, { game, name, publisher });
}


/******************************************************************************/


// Add a game to the owned collection for this household.
export async function apiAddGameToCollection (user, game, name, publisher) {
  return await rawAction(true, `/household/collection/${user?.household.slug}`, game, name, publisher);
}


/******************************************************************************/


// Add a game to the wishlist for this household.
export async function apiAddGameToWishlist(user, game, name) {
  return rawAction(true, `/household/wishlist/${user?.household.slug}`, game, name);

}


/******************************************************************************/


// Remove a game from the owned collection for this household.
export async function apiRemoveGameFromCollection (user, game, name, publisher) {
  return await rawAction(false, `/household/collection/${user?.household.slug}`, game, name, publisher);
}


/******************************************************************************/


// Remove a game from the wishlist for this household.
export async function apiRemoveGameFromWishlist(user, game, name) {
  return rawAction(false, `/household/wishlist/${user?.household.slug}`, game, name);

}

/******************************************************************************/
