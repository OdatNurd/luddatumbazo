/******************************************************************************/


import { BGGLookupError } from '../db/exceptions.js';
import { success, fail } from "./common.js";

import { updateMetadata, getMetadataDetails, getMetadataList } from '../db/metadata.js';


/******************************************************************************/


/* Input:
 *   An array of JSON objects of the form:
 *    {
 *      "bggId": 1027,
 *      "name": "Trivia",
 *      "slug": "trivia"
 *    }
 *
 * Parameter:
 *    One of the metatypes from the metaTableMap table, to indicate which of
 *    the tables we are dealing with.
 *
 * This call will ensure that all of the input objects have all three fields
 * by inserting a 0 bggId if one is not present, and by generating a slug from
 * the name if a slug is not present.
 *
 * Once that is done, a bulk insert will occur that adds all items to the table
 * that don't already exist there.
 *
 * For the purposes of existing:
 *   - the bggId is used to see if an entry has previously been inserted
 *
 * That is to say, it is possible to insert the same item with the same name
 * multiple times, but when trying to import a BGG based item the call will
 * skip over all items that are BGG related which have previously been imported.
 *
 * The result is currently the native D1 result of the query. */
export async function metadataUpdateReq(ctx) {
  const { metaType } = ctx.req.param();

  // Prepare the Metadata update and execute it
  const result = await updateMetadata(ctx, await ctx.req.json(), metaType);

  return success(ctx, `updated some ${metaType} records` , result);
}


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
  const { idOrSlug, metaType } = ctx.req.param();

  // If this field exists in the query (regardless of the value), then we will
  // also gather game information.
  const includeGames = (ctx.req.query("games") !== undefined);

  // Try to look up the data; if we didn't find anything we can signal an
  // error back.
  const record = await getMetadataDetails(ctx, metaType, idOrSlug, includeGames)
  if (record === null) {
    return fail(ctx, `no such ${metaType} ${idOrSlug}`, 404);
  }

  return success(ctx, `information on ${metaType} ${idOrSlug}`, record);
}


/******************************************************************************/


/* Return back a list of all of the metadata items of the given type; this may
 * be an empty list. */
export async function metadataListReq(ctx) {
  const { metaType } = ctx.req.param();

  // Try to look up the data; if we didn't find anything we can signal an
  // error back.
  const result = await getMetadataList(ctx, metaType);

  return success(ctx, `found ${result.length} ${metaType} records`, result);
}


/******************************************************************************/
