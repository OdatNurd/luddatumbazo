/******************************************************************************/


import { getSessionList } from '#db/session';
import { performGameLookup } from '#db/game';
import { success  } from "#requests/common";


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
  // TODO: This is stupid because we could check the list to see which items are
  //       numbers, and then only perform, the lookup for any that don't appear
  //       to be. However this is still a WIP, so blindly doing the dumb thing
  //       for the moment.
  const lookup = await performGameLookup(ctx, games);

  // Fetch and return the list, optionally filtering and reversing it.
  const result = await getSessionList(ctx, lookup.map(e => e.id), reverse);

  return success(ctx, `found ${result.length} session(s)`, result);
}


/******************************************************************************/
