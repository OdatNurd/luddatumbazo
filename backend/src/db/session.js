/******************************************************************************/


import { getDBResult } from './common.js';


/******************************************************************************/


/* Get the full details on the game with either the ID or slug provided. The
 * return will be null if there is no such game, otherwise the return is an
 * object that contains the full details on the game, including all of its
 * metadata. */
export async function getSessionDetails(ctx, sessionId) {
  // Try to find the game with the value has that been provided; we check to see
  // if the provided ID is either a slug or an actual ID.
  const lookup = await ctx.env.DB.prepare(`
    SELECT * FROM SessionReport
     WHERE id = ?1
  `).bind(sessionId).all();
  const result = getDBResult('getSessionDetails', 'find_session', lookup);

  // If there was no result found, then return null back to signal that.
  if (result.length === 0) {
    return null;
  }

  return result;
}


/******************************************************************************/
