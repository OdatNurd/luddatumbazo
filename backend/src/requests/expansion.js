/******************************************************************************/


import { success, fail } from "./common.js";

import { updateExpansionDetails, updateExpansionDetailsByBGG } from '../db/expansion.js';


/******************************************************************************/


/* Input: An array of items that contains information on either expansions for
 *        a particular game or something.
 *
 * This will attempt to do the stuff in the place. */
export async function updateExpansionDetailsReq(ctx) {
  // Get the body of data that allows us to perform the expansion update
  // Grab the records that give us information on the expansion information that
  // we want to update.
  const expansionUpdate = await ctx.req.json();

  // Pull out the keys and verify that they all exist; if not, raise an error.
  const { gameId, bggId, expansions } = expansionUpdate;
  if ([gameId, expansions].indexOf(undefined) !== -1) {
    throw new Error(`request has missing fields`);
  }

  // Execute the request and return the result back.
  const result = await updateExpansionDetails(ctx, gameId, bggId, expansions);

  return success(ctx, `updated expansion links`, result);
}


/******************************************************************************/


/* Input: A BGG Game ID for a game that should exist in our database.
 *
 * This will check that the game is in the database, and if so will reach out
 * to BGG to fetch core information, find the list of expansions, and then
 * perform the expansion update as the other method would. */
export async function updateExpansionDetailsBggReq(ctx) {
  // Get the bggGameId for the game we were given
  const { bggGameId } = ctx.req.param();

  // Execute the request and return the result back.
  const result = await updateExpansionDetailsByBGG(ctx, bggGameId);

  return success(ctx, `updated expansion links`, result);
}


/******************************************************************************/

