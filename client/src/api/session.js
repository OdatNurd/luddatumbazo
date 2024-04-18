/******************************************************************************/


import { raw } from './fetch.js';


/******************************************************************************/


/* Gather a list of session reports, either for all games or only for those
 * games specificaly provided. The list can optionally also be reversed on
 * output, putting the most recent sessions at the top instead of on the
 * bottom.
 *
 * The list of games is optional; if provided, it can be an array of either
 * game slugs, game identifiers, or both.
 *
 * THe result is a list of short session objects. */
async function sessionList (reverse, games) {
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

  return raw.get('/session/list', options);
}


/******************************************************************************/


/* Gather the details of a specific session based on it's session identifier. */
async function sessionDetails (sessionId) {
    return raw.get(`/session/${sessionId}`);
}


/******************************************************************************/


/* Export a composed object that collects the related API's together into a
 * single object based on the operations. */
export const session = {
  list: sessionList,
  details: sessionDetails,
}


/******************************************************************************/
