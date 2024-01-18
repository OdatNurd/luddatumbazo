/******************************************************************************/


import { success } from "../../common.js";

import { updateExpansionDetails } from '../../../db/expansion.js';


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
