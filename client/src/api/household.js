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


/* Assign an owned game to a storage location, or clear its location. A null
 * location is the virtual Unstored bucket; isOnShelf must then be false. */
async function setGameStorage(household, game, storageLocationId, isOnShelf) {
  return raw.put(`/household/collection/${slug(household)}/storage`, {
    game,
    storageLocationId,
    isOnShelf
  });
}


/******************************************************************************/


/* Fetch the storage tree for a household and the virtual Unstored/off-shelf
 * counts that sit above it. */
async function getStorageLocations(household) {
  return raw.get(`/household/storage/${slug(household)}/list`);
}


/******************************************************************************/


/* Fetch the games stored in a location, either directly or in its whole
 * subtree. The location can be identified by either its numeric ID or its
 * stored slug. */
async function getStorageContents(household, storageIdOrSlug, includeChildren) {
  return raw.get(
    `/household/storage/${slug(household)}/contents/${encodeURIComponent(storageIdOrSlug)}`,
    { includeChildren: includeChildren ? 1 : 0 }
  );
}


/******************************************************************************/


/* Fetch every game that has a storage location but is currently off shelf. */
async function getOffShelfGames(household) {
  return raw.get(`/household/storage/${slug(household)}/off-shelf`);
}


/******************************************************************************/


/* Fetch every owned game that does not have a storage location yet. */
async function getUnstoredGames(household) {
  return raw.get(`/household/storage/${slug(household)}/unstored`);
}


/******************************************************************************/


/* Change the shelf state of several owned games at once. Games without a
 * storage location are ignored by the server. */
async function setGamesShelf(household, gameIds, isOnShelf) {
  return raw.put(`/household/storage/${slug(household)}/shelf`, {
    gameIds,
    isOnShelf
  });
}


/******************************************************************************/


/* Move several owned games to one storage location. Games that were previously
 * Unstored become on shelf; games that already had a location keep their shelf
 * state. */
async function setGamesLocation(household, gameIds, storageLocationId) {
  return raw.put(`/household/storage/${slug(household)}/location`, {
    gameIds,
    storageLocationId
  });
}


/******************************************************************************/


/* Create a storage location, optionally under a parent location. */
async function createStorageLocation(household, name, parentId) {
  return raw.put(`/household/storage/${slug(household)}/create`, { name, parentId });
}


/******************************************************************************/


/* Rename a storage location without changing its parent. */
async function updateStorageLocation(household, storageId, name) {
  return raw.put(`/household/storage/${slug(household)}/update`, { storageId, name });
}


/******************************************************************************/


/* Delete an empty storage location. */
async function removeStorageLocation(household, storageId) {
  return raw.delete(`/household/storage/${slug(household)}/delete`, { storageId });
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
    storage: setGameStorage,
  },

  storage: {
    list: getStorageLocations,
    contents: getStorageContents,
    offShelf: getOffShelfGames,
    unstored: getUnstoredGames,
    shelf: setGamesShelf,
    assign: setGamesLocation,
    create: createStorageLocation,
    update: updateStorageLocation,
    remove: removeStorageLocation,
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
