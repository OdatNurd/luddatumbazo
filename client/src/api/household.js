/******************************************************************************/


import { raw } from './fetch.js';


/******************************************************************************/


/* This internal helper carries out a collection action that can either insert
 * or delete an item from a wishlist or collection based on the arguments and
 * URI provided.
 *
 * All four operations are near identical in their arguments, differing only
 * in the verb used and the URI, which is distinct for each.
 *
 * In all cases, the game and publisher can be either the numeric ID of the item
 * or the distinct textual slug. The name can be either the full textual name
 * of an entry for that game, or the name entry's distinguishing ID value. */
async function rawAction(doInsert, URI, game, name, publisher) {
  const func = (doInsert === true) ? raw.put : raw.delete;
  return func(URI, { game, name, publisher });
}


/******************************************************************************/


/* Gather the household from the user record provided, and invoke the API to
 * include a record that says that the game with the given name and publisher
 * identifiers is a part of the household's collection.
 *
 * Adding a game to the collection also implicitly removes that game from the
 * wishlist, if it is present there. */
async function addToCollection (user, game, name, publisher) {
  return rawAction(true, `/household/collection/${user?.household.slug}/add`, game, name, publisher);
}


/******************************************************************************/


/* Gather the household from the user record provided, and invoke the API to
 * include a record that says that the game with the given name and publisher
 * identifiers is a part of the household's wishlist. */
async function addToWishlist(user, game, name) {
  return rawAction(true, `/household/wishlist/${user?.household.slug}/add`, game, name);
}


/******************************************************************************/


/* Gather the household from the user record provided, and invoke the API to
 * remove the record that says that the game with the given name and publisher
 * identifiers is a part of the household's collection. */
async function removeFromCollection (user, game) {
  return rawAction(false, `/household/collection/${user?.household.slug}/remove`, game,);
}


/******************************************************************************/


/* Gather the household from the user record provided, and invoke the API to
 * remove the record that says that the game with the given name and publisher
 * identifiers is a part of the household's wishlist. */
async function removeFromWishlist(user, game) {
  return rawAction(false, `/household/wishlist/${user?.household.slug}/remove`, game);
}


/******************************************************************************/


/* Fetch the complete list of games owned by the primary household of the passed
 * in user.
 *
 * The returned list is a list of short game records that are owned by that
 * household. */
async function getCollectionContents(user) {
  return raw.get(`/household/collection/${user?.household.slug}/contents`);
}


/******************************************************************************/


/* Fetch the complete list of games wish for by the primary household of the
 * passedin user.
 *
 * The returned list is a list of short game records that are wishlisted by that
 * household. */
async function getWishlistContents(user) {
  return raw.get(`/household/wishlist/${user?.household.slug}/contents`);
}

/******************************************************************************/


/* Export a composed object that collects the related API's together into a
 * single object based on the operations. */
export const household = {
  collection: {
    contents: getCollectionContents,
    add: addToCollection,
    remove: removeFromCollection,
  },

  wishlist: {
    contents: {
      get: getWishlistContents,
      add: addToWishlist,
      remove: removeFromWishlist,
    }
  }
}


/******************************************************************************/
