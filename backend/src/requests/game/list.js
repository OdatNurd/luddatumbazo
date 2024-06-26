/******************************************************************************/


import { success } from '#requests/common';

import { dbGameList } from '#db/game';


/******************************************************************************/


/* Return back a list of all of the metadata items of the given type; this may
 * be an empty list. */
export async function reqGameList(ctx) {
  const result = await dbGameList(ctx);

  return success(ctx, `found ${result.length} games`, result);
}


/******************************************************************************/
