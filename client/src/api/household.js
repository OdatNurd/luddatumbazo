/******************************************************************************/


import { raw } from './fetch.js';


/******************************************************************************/


/* All of the API methods here require a household to be provided; this pulls
 * the slug out for that household for use in URL's.
 *
 * The value has a fallback in case the caller calls us with something that
 * doesn't have a slug. */
const slug = household => household?.slug ?? 'userHasNoHousehold';


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


/* Invoke the API to include a record that says that the game with the given
 * name and publisher identifiers is a part of the household's collection.
 *
 * Adding a game to the collection also implicitly removes that game from the
 * wishlist, if it is present there. */
async function addToCollection (household, game, name, publisher) {
  return rawGameDataAction(true, `/household/collection/${slug(household)}/add`, game, name, publisher);
}


/******************************************************************************/


/* Invoke the API to include a record that says that the game with the given
 * name and publisher identifiers is a part of the household's wishlist with
 * the given ID or slug. */
async function addToWishlist(household, game, name, wishlist) {
  return rawGameDataAction(true, `/household/wishlist/${slug(household)}/add/${wishlist}`, game, name);
}


/******************************************************************************/


/* Invoke the API to remove the record that says that the game with the given
 * name and publisher identifiers is a part of the household's collection. */
async function removeFromCollection (household, game) {
  return rawGameDataAction(false, `/household/collection/${slug(household)}/remove`, game,);
}


/******************************************************************************/


/* Invoke the API to remove the record that says that the game with the given
 * name and publisher identifiers is a part of the household's wishlist. */
async function removeFromWishlist(household, game) {
  return rawGameDataAction(false, `/household/wishlist/${slug(household)}/remove`, game);
}


/******************************************************************************/


/* Fetch the complete list of games owned by the passed in household of the
 * current user.
 *
 * The returned list is a list of short game records that are owned by that
 * household. */
async function getCollectionContents(household) {
  return raw.get(`/household/collection/${slug(household)}/contents`);
}


/******************************************************************************/


/* Fetch the complete list of games wish for by the household of the current
 * user.
 *
 * The returned list is a list of short game records that are wishlisted by that
 * household. */
async function getWishlistContents(household, wishlist) {
  return raw.get(`/household/wishlist/${slug(household)}/contents/${wishlist}`);
}


/******************************************************************************/


/* Fetch details on the complete list of wishlists that are owned by the
 * provided household; this will always be at least one because every household
 * has a root wishlist.
 *
 * The returned list is a set of list details, which includes name, slug and
 * ID values. */
async function getListOfWishlists(household) {
  return raw.get(`/household/wishlist/${slug(household)}/list`);
}


/******************************************************************************/


/* Invoke the API to remove the record that says that the game with the given
 * name and publisher identifiers is a part of the provided wishlist */
async function createNewWishlist (household, name, slug) {
  return rawWishlistAction(true, `/household/wishlist/${slug(household)}/create`, name, slug,);
}


/******************************************************************************/


/* Invoke the API to remove the record that says that the game with the given
 * name and publisher identifiers is a part of the household's wishlist.
 *
 * No wishlist is required here because a game can only appear in one wishlist
 * at a time for any given household. */
async function deleteExistingWishlist(household, slugOrId) {
  return rawWishlistAction(false, `/household/wishlist/${slug(household)}/delete`, null, null, slugOrId);
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
