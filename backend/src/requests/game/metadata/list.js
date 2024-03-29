/******************************************************************************/


import { success } from '#requests/common';

import { getMetadataList } from '#db/metadata';


/******************************************************************************/


/* Return back a list of all of the metadata items of the given type; this may
 * be an empty list. */
export async function metadataListReq(ctx) {
  const { metaType } = ctx.req.valid('param');

  // Try to look up the data; if we didn't find anything we can signal an
  // error back.
  const result = await getMetadataList(ctx, metaType);

  return success(ctx, `found ${result.length} ${metaType} records`, result);
}



/******************************************************************************/
