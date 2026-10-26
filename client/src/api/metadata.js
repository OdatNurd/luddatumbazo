/******************************************************************************/


import { raw } from './fetch.js';


/******************************************************************************/


/* Given a metadata type and the id for a metadata item of that type, return
 * back details on that metadata item.
 *
 * If games is true, the returned object will contain a short list of the games
 * that have that metadata type applied to them.
 *
 * Ostensibly, this is used to verify that a given metadata id exists, but can
 * also be used to populate lists of related games.
 *
 * When provided, the list of games is a list of short game records. */
async function metaDetails (metaType, metaId, games) {
  const options = { };

  if (games === true) {
    options.games = true;
  }

  return raw.get(`/game/meta/${metaType}/${metaId}`, options);
}


/******************************************************************************/


/* Gather a list of all of the underlying metadata records of the given metaType
 * (e.g. 'designer', 'publisher', 'artist', 'category' or 'mechanic').
 *
 * The return is a list of short records that provides all of the known metadata
 * entries of that type. */
async function metaList (metaType) {
  return raw.get(`/game/meta/${metaType}/list`);
}


/******************************************************************************/


/* Insert any of the provided metadata records of the given type that do not
 * already exist in the database.
 *
 * The records may be partial: a missing bggId is filled in as 0 (the marker
 * for a hand made entry as opposed to a BGG import) and a missing slug is
 * generated from the name by the back end.
 *
 * The result is the list of records, new or pre-existing, that match what was
 * sent. */
async function metaUpdate (metaType, records) {
  return raw.put(`/game/meta/${metaType}/update`, records);
}


/******************************************************************************/


/* Export a composed object that collects the related API's together into a
 * single object based on the operations. */
export const metadata = {
  details: metaDetails,
  list: metaList,
  update: metaUpdate,
}


/******************************************************************************/
