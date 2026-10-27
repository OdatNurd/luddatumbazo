/******************************************************************************/


import { raw } from './fetch.js';


/******************************************************************************/


/* Given a numeric BoardGameGeek game ID, look the game up on BGG and return
 * back the normalized record for it: core details (names, description, player
 * and time ranges, complexity), the image/thumbnail URLs on BGG's CDN, and the
 * lists of designers, artists, publishers, categories and mechanics as
 * { name, bggId, slug } items.
 *
 * This is a read-only fetch; it never writes anything to our database. */
async function lookupGame(bggId) {
  return raw.get(`/bgg/boardgame/${bggId}`);
}


/******************************************************************************/


/* Export a composed object that collects the related API's together into a
 * single object based on the operations. */
export const bgg = {
  lookup: lookupGame
}


/******************************************************************************/
