/******************************************************************************/


import { success } from '#requests/common';

import { dbExpansionUpdateByBGG } from '#db/expansion';


/******************************************************************************/


/* Input: A BGG Game ID for a game that should exist in our database.
 *
 * This will check that the game is in the database, and if so will reach out
 * to BGG to fetch core information, find the list of expansions, and then
 * perform the expansion update as the other method would. */
export async function updateExpansionDetailsBggReq(ctx) {
  // Get the bggGameId for the game we were given
  const { bggId } = ctx.req.valid('param');

  // Execute the request and return the result back.
  const result = await dbExpansionUpdateByBGG(ctx, bggId);

  return success(ctx, `updated expansion links`, result);
}


/******************************************************************************/
