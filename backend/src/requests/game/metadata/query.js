/******************************************************************************/


import { success, fail } from '#requests/common';

import { dbMetadataDetails  } from '#db/metadata';


/******************************************************************************/


/* Take as input a value that is one of:
 *   - an internal ID of the given type of metadata
 *   - a slug that represents an item
 *
 * The return value is information on that item (if any). Optionally, the query
 * can include a "games" directive to also return information on the games that
 * reference this data. */
export async function metadataQueryReq(ctx) {
  const { idOrSlug, metaType } = ctx.req.valid('param');
  const { games } = ctx.req.valid('query');

  // Try to look up the data; if we didn't find anything we can signal an
  // error back.
  const record = await dbMetadataDetails(ctx, metaType, idOrSlug, games)
  if (record === null) {
    return fail(ctx, `no such ${metaType} ${idOrSlug}`, 404);
  }

  return success(ctx, `information on ${metaType} ${idOrSlug}`, record);
}


/******************************************************************************/
