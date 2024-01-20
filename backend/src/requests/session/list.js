/******************************************************************************/


import { success, fail } from '#requests/common';

import { getSessionList } from '#db/session';
import { performGameLookup } from '#db/game';


/******************************************************************************/


/* Fetch a short list of all of the session reports that are currently known to
 * the system, optionally also filtering based on gameId's for games in the
 * session.
 *
 * In the future this will provide other various filters to control which items
 * are returned, but at time of writing (during Devember) this is more
 * simplistic than that and only supports gameId filters. */
export async function sessionListReq(ctx) {
  // The query can contain a flag to tell us that we should reverse the sort,
  // and an option list of game id's and slugs to look up sessions for.
  const { reverse, games } = ctx.req.valid('query');

  // Use the list in a lookup to map it to objects that we can use to get to
  // definitive gameId values to pass in.
  //
  // The lookup has a variable return; a single lookup returns an object or null
  // and a list always returns an array. The session code always wants an array.
  let lookup = await performGameLookup(ctx, games, undefined, false);
  if (Array.isArray(lookup) === false) {
    lookup = [lookup];
  }
  if (lookup[0] === null) {
    lookup.splice(0, 1);
  }

  // If the list of things to look up is empty, and the input game list is not,
  // then someone tried to look up sessions for one or more games that don't
  // exist, so generate an error.
  if (lookup.length === 0 && games.length !== 0) {
    return fail(ctx, 'cannot look up session reports for non-existant games', 404);
  }

  // Fetch and return the list, optionally filtering and reversing it.
  const result = await getSessionList(ctx, lookup.map(e => e.id), reverse);

  return success(ctx, `found ${result.length} session(s)`, result);
}


/******************************************************************************/
