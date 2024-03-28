/******************************************************************************/


import { success, fail } from '#requests/common';

import { dbGameLookup } from '#db/game';


/******************************************************************************/


/* Takes as a body an array of values that are either gameId values or game slug
 * names, and returns back a list of objects that tell you the id and slug
 * values for all matched games. */
export async function performGameLookupReq(ctx) {
  const filterList = ctx.req.valid('json');
  const { imageType } = ctx.req.valid('query');

  // Do the lookup; for our purposes here, we never want the nameId.
  const result = await dbGameLookup(ctx, filterList, imageType, false);
  if (result === null) {
    return fail(ctx, `unable to locate game: ${filterList[0]}`, 404)
  }

  // Construct an appropriate message.
  const msg = Array.isArray(result)
      ? `looked up ${result.length} games`
      : 'located game details';

  return success(ctx, msg, result);
}


/******************************************************************************/
