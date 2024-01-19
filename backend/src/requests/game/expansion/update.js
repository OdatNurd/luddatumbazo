/******************************************************************************/


import { success } from "#requests/common";

import { updateExpansionDetails } from '#db/expansion';


/******************************************************************************/


/* Input: An array of items that contains information on either expansions for
 *        a particular game or something.
 *
 * This will attempt to do the stuff in the place. */
export async function updateExpansionDetailsReq(ctx) {
  // Get the body of data that allows us to perform the expansion update
  // Grab the records that give us information on the expansion information that
  // we want to update.
  const { gameId, bggId, expansions } = ctx.req.valid('json');

  // Execute the request and return the result back.
  const result = await updateExpansionDetails(ctx, gameId, bggId, expansions);

  return success(ctx, `updated expansion links`, result);
}


/******************************************************************************/
