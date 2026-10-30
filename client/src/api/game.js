/******************************************************************************/


import { raw } from './fetch.js';


/******************************************************************************/


/* Gather the complete details for a game based on its numeric ID or its
 * unique textual slug.
 *
 * If a user is provided, then the primary household of that user is used to
 * determine any ownership and wishlist data for that particular game. */
async function gameDetails(user, game) {
  // Set household to undefined when the user is not specified, it does not have
  // a household, or the household has no slug.
  return raw.get(`/game/${game}`, {
      household: user?.household?.slug
    });
}


/******************************************************************************/


/* Gather the complete list of all games that are known to the system.
 *
 * The result is a list of short game details, including names, id values and
 * slugs. */
async function gameList() {
  return raw.get('/game/list');
}


/******************************************************************************/


/* Gather the complete list of game asset files that have been uploaded and
 * attached to the game whose slug or ID is provied. */
async function fileList(game) {
  return raw.get(`/asset/game/${game}/list`);
}


/******************************************************************************/


/* Add a new game to the database from the data gathered by the game dialog.
 * The back end builds the slug from the primary name, stores the names and
 * metadata, and ingests the image URL into Cloudflare Images when that is
 * configured. */
async function gameAdd(game) {
  return raw.put('/game/data/details/add', game);
}


/******************************************************************************/


/* Export a composed object that collects the related API's together into a
 * single object based on the operations. */
export const game = {
  details: gameDetails,
  list: gameList,
  add: gameAdd,
  assets: {
    list: fileList
  }
}


/******************************************************************************/
