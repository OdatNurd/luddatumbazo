/******************************************************************************/


import { success } from '#requests/common';

import { dbMetadataUpdate } from '#db/metadata';


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
  const { metaType } = ctx.req.valid('param');
  const updateData = ctx.req.valid('json');

  // Prepare the Metadata update and execute it
  const result = await dbMetadataUpdate(ctx, updateData, metaType);

  return success(ctx, `updated some ${metaType} records` , result);
}


/******************************************************************************/
