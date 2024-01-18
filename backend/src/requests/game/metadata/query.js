/******************************************************************************/


import { success, fail } from "../../common.js";

import { getMetadataDetails  } from '../../../db/metadata.js';


/******************************************************************************/


/* Take as input a value that is one of:
 *   - an internal ID of the given type of metadata
 *   - a slug that represents an item
 *
 * The return value is information on that item (if any). Optionally, the query
 * can include a "games" directive to also return information on the games that
 * reference this data. */
export async function metadataQueryReq(ctx) {
  // Can be either an item ID or a slug for the given metadata item
  const { slug, metaType } = ctx.req.param();

  // If this field exists in the query (regardless of the value), then we will
  // also gather game information.
  const includeGames = (ctx.req.query("games") !== undefined);

  // Try to look up the data; if we didn't find anything we can signal an
  // error back.
  const record = await getMetadataDetails(ctx, metaType, slug, includeGames)
  if (record === null) {
    return fail(ctx, `no such ${metaType} ${slug}`, 404);
  }

  return success(ctx, `information on ${metaType} ${slug}`, record);
}


/******************************************************************************/
