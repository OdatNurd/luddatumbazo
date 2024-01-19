/******************************************************************************/


import { success } from '#requests/common';

import { performGameLookup } from '#db/game';


/******************************************************************************/


/* Takes as a body an array of values that are either gameId values or game slug
 * names, and returns back a list of objects that tell you the id and slug
 * values for all matched games. */
export async function performGameLookupReq(ctx) {
  const filterList = await ctx.req.valid('json');

  const result = await performGameLookup(ctx, filterList);
  return success(ctx, `looked up ${result.length} games`, result);
}


/******************************************************************************/
