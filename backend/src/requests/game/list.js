/******************************************************************************/


import { success } from '#requests/common';

import { getGameList } from '#db/game';


/******************************************************************************/


/* Return back a list of all of the metadata items of the given type; this may
 * be an empty list. */
export async function gameListReq(ctx) {
  const result = await getGameList(ctx);

  return success(ctx, `found ${result.length} games`, result);
}


/******************************************************************************/
