/******************************************************************************/


import { raw } from './fetch.js';


/******************************************************************************/


/* Gather the list of known and approved game types; when recording a session,
 * these are used to control what type of game is being recorded in the session,
 * and the data is also used in session report detail pages. */
async function gameTypeList() {
  return raw.get('/session/gametypes');
}


/******************************************************************************/

/* Gather a list of session reports, either for all games or only for those
 * games specificaly provided. The list can optionally also be reversed on
 * output, putting the most recent sessions at the top instead of on the
 * bottom.
 *
 * The list of games is optional; if provided, it can be an array of either
 * game slugs, game identifiers, or both. The optional status value limits the
 * result to open or closed reports; omitting it returns both.
 *
 * The result is a list of short session objects. */
async function sessionList(reverse, games, status) {
  const options = { };

  // If requested, include the option to reverse the list.
  if (reverse === true) {
    options.reverse = true;
  }

  // If a game or list of games was provided, then add that to the options as
  // well.
  if (games !== undefined) {
    // Conform list of games to an array if it's not one.
    if (Array.isArray(games) === false) {
      games = [games];
    }

    options.games = games.join(',');
  }

  // An omitted status is the complete list; only send the filter when the
  // caller actually requested one.
  if (status === 'open' || status === 'closed') {
    options.status = status;
  }

  return raw.get('/session/list', options);
}


/******************************************************************************/


/* Gather the summary counts used by the profile menu and open-session view. */
async function sessionStatus() {
  return raw.get('/session/status');
}


/******************************************************************************/


/* Gather the details of a specific session based on it's session identifier. */
async function sessionDetails (sessionId) {
    return raw.get(`/session/${sessionId}`);
}


/******************************************************************************/


/* Add a new session report. The reporter is taken from the authenticated
 * request on the service side, so it is not part of the payload. */
async function sessionAdd(report) {
  return raw.put('/session/add', report);
}


/******************************************************************************/


/* Update the editable parts of an existing session report. A null sessionEnd
 * reopens the session; an omitted sessionEnd leaves it unchanged. */
async function sessionUpdate(sessionId, update) {
  return raw.patch(`/session/update/${sessionId}`, update);
}


/******************************************************************************/


/* Export a composed object that collects the related API's together into a
 * single object based on the operations. */
export const session = {
  gameTypes: gameTypeList,
  status: sessionStatus,
  list: sessionList,
  details: sessionDetails,
  add: sessionAdd,
  update: sessionUpdate,
}


/******************************************************************************/
