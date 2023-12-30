/******************************************************************************/


import { addSession, updateSession, getSessionList,
         getSessionDetails } from '../db/session.js';
import { success, fail } from "./common.js";


/******************************************************************************/


/* Given an object that contains the required data to insert a new session
 * report into the system, insert the required data and ship the results back.
 *
 * For details on the actual body of the object, see the addSession() call.
 *
 * This will do all updates required to insert the record for this session
 * report; an object that contains the full details of the new report (as it
 * would be returned from the details request below) is returned back. */
export async function sessionAddReq(ctx) {
  // Pull in the body of the request, which will contain the data for setting up
  // the session report.
  const sessionData = await ctx.req.json();

  // Add the session and return the result.
  const result = await addSession(ctx, sessionData);

  return success(ctx, `added new session report`, result);
}


/******************************************************************************/


/* Given an object with some patch details for a session report, update an
 * existing session record to include the new data.
 *
 * This does not allow wholesale edits; only details such as the end time,
 * textual content and player status is allowed to change.
 *
 * The request will return data similar to an add/get, but with updated
 * details.
 */
export async function sessionUpdateReq(ctx) {
  // Fetch the ID of the session to update and the body of the update.
  const { sessionId } = ctx.req.param();
  const updateData = await ctx.req.json();

  // Update the session with the data; if there is no result from this, it is
  // because the session does not exist, so we can report as such.
  const result = await updateSession(ctx, sessionId, updateData);
  if (result === null) {
    return fail(ctx, `no such session ${sessionId}`, 404)
  }

  return success(ctx, `updated session ${sessionId}`, result);
}


/******************************************************************************/


/* Fetch a short list of all of the session reports that are currently known to
 * the system, optionally also filtering based on gameId's for games in the
 * session.
 *
 * In the future this will provide itger various filters to control which items
 * are returned, but at time of writing (during devember) this is more
 * simplistic than that and only supports gameId filters. */
export async function sessionListReq(ctx) {
  // The query can optionally contain a list of games to collect the session
  // reports for; these will be searched as both the main game as well as an
  // expansion to some game.
  const games = ctx.req.query("games") ?? '';
  const gameFilter = games.split(',').map(e => parseInt(e))
                                     .filter(e => isNaN(e) === false);

  // Fetch and return the list, optionally filtering it.
  const result = await getSessionList(ctx, gameFilter);

  return success(ctx, `found ${result.length} session(s)`, result);
}


/******************************************************************************/


/* Given a specific session report ID, return back an object with the full
 * details of that session report, if possible. */
export async function sessionDetailsReq(ctx) {
  // Get the session ID
  const { sessionId } = ctx.req.param();

  // Look up the session; if we don't fiond one, then report that it does not
  // exist.
  const result = await getSessionDetails(ctx, sessionId);
  if (result === null) {
    return fail(ctx, `no such session ${sessionId}`, 404)
  }

  return success(ctx, `information on session ${sessionId}`, result);
}


/******************************************************************************/

