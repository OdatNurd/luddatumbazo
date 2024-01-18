/******************************************************************************/


import { success } from "../common.js";

import { getGameList } from '../../db/game.js';


/******************************************************************************/


/* Return back a list of all of the metadata items of the given type; this may
 * be an empty list. */
export async function gameListReq(ctx) {
  const result = await getGameList(ctx);

  return success(ctx, `found ${result.length} games`, result);
}


/******************************************************************************/
