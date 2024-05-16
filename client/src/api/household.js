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
async function rawGameDataAction(doInsert, URI, game, name, publisher) {
  const func = (doInsert === true) ? raw.put : raw.delete;
  return func(URI, { game, name, publisher });
}


/******************************************************************************/


/* This internal helper carries out actions related to the mainenance of the
 * list of wish lists itself (the rawGameDataAction helper is used to manipulate
 * the contents of lists currently).
 *
 * Creating a new wishlist requires a name and a slug, while deleting requires
 * either the ID value or the slug, in a field called wishlist. */
async function rawWishlistAction(doInsert, URI, name, slug, wishlist) {
  const func = (doInsert === true) ? raw.put : raw.delete;
  return func(URI, { name, slug, wishlist });
}


/******************************************************************************/


/* Gather the household from the user record provided, and invoke the API to
 * include a record that says that the game with the given name and publisher
 * identifiers is a part of the household's collection.
 *
 * Adding a game to the collection also implicitly removes that game from the
 * wishlist, if it is present there. */
async function addToCollection (user, game, name, publisher) {
  return rawGameDataAction(true, `/household/collection/${user?.household.slug}/add`, game, name, publisher);
}


/******************************************************************************/


/* Gather the household from the user record provided, and invoke the API to
 * include a record that says that the game with the given name and publisher
 * identifiers is a part of the household's wishlist with the given ID. */
async function addToWishlist(user, game, name, wishlist) {
  return rawGameDataAction(true, `/household/wishlist/${user?.household.slug}/add/${wishlist}`, game, name);
}


/******************************************************************************/


/* Gather the household from the user record provided, and invoke the API to
 * remove the record that says that the game with the given name and publisher
 * identifiers is a part of the household's collection. */
async function removeFromCollection (user, game) {
  return rawGameDataAction(false, `/household/collection/${user?.household.slug}/remove`, game,);
}


/******************************************************************************/


/* Gather the household from the user record provided, and invoke the API to
 * remove the record that says that the game with the given name and publisher
 * identifiers is a part of the household's wishlist. */
async function removeFromWishlist(user, game) {
  return rawGameDataAction(false, `/household/wishlist/${user?.household.slug}/remove`, game);
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
async function getWishlistContents(user, wishlist) {
  return raw.get(`/household/wishlist/${user?.household.slug}/contents/${wishlist}`);
}


/******************************************************************************/


/* Fetch details on the complete list of wishlists that are owned by the
 * primary household; this will always be at least one because every household
 * has a root wishlist.
 *
 * The returned list is a set of list details, which includes name, slug and
 * ID values. */
async function getListOfWishlists(user) {
  return raw.get(`/household/wishlist/${user?.household.slug}/list`);
}


/******************************************************************************/


/* Gather the household from the user record provided, and invoke the API to
 * remove the record that says that the game with the given name and publisher
 * identifiers is a part of the household's collection. */
async function createNewWishlist (user, name, slug) {
  return rawWishlistAction(true, `/household/wishlist/${user?.household.slug}/create`, name, slug,);
}


/******************************************************************************/


/* Gather the household from the user record provided, and invoke the API to
 * remove the record that says that the game with the given name and publisher
 * identifiers is a part of the household's wishlist. */
async function deleteExistingWishlist(user, slugOrId) {
  return rawWishlistAction(false, `/household/wishlist/${user?.household.slug}/delete`, null, null, slugOrId);
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
    lists: {
      list: getListOfWishlists,
      add: createNewWishlist,
      remove: deleteExistingWishlist,
    },
    contents: {
      get: getWishlistContents,
      add: addToWishlist,
      remove: removeFromWishlist,
    }
  }
}


/******************************************************************************/
