/******************************************************************************/


import { success } from "../../common.js";

import { purgeUnusedMetadata } from '../../../db/metadata.js';


/******************************************************************************/


/* Find all of the metadata items of the given type that do not have any
 * references to it and purge them away from the database. */
export async function metadataPurgeReq(ctx) {
  const { metaType } = ctx.req.param();

  // If this field exists in the query (regardless of the value), then we will
  // also purge the found information.
  const purgeRecords = (ctx.req.query("doPurge") !== undefined);

  // Try to execute the request; this will either return the data, or purge it,
  // depending on the arguments we got.
  const result = await purgeUnusedMetadata(ctx, metaType, purgeRecords);

  const msg = (purgeRecords === true)
               ? `purged all unused ${metaType} records`
               : `found ${result.length} unused ${metaType} records`;

  return success(ctx, msg, result);
}


/******************************************************************************/
