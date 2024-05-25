/******************************************************************************/


import { success, fail } from '#requests/common';

import { dbAssetDelete } from "#db/asset";


/******************************************************************************/


/* Handle a request to delete a game asset from the database and from the
 * bucket.
 *
 * This requires only the key to delete, and will try to delete any associated
 * record from the database and from the bucket, without requiring that the
 * key is actually available in either. */
export async function reqGameAssetDelete(ctx) {
  // Get the key to delete.
  const { key } = ctx.req.valid('json');

  // Delete from the database, in case there is a record for the key
  const rowsDeleted = await dbAssetDelete(ctx, key);

  // Check to see if this object exists in the bucket or not; if it is, then
  // delete it from the bucket before proceeding.
  const bucketCheck = await ctx.env.BUCKET.head(key);
  if (bucketCheck !== null) {
    await ctx.env.BUCKET.delete(key);
  }

  // If nothing was deleted from the database AND the key was not present in
  // the bucket, then report back an error to indicate that the delete was for
  // something that was completely nonexistent.
  if (rowsDeleted === 0 && bucketCheck === null) {
    return fail(ctx, `no such asset '${key}' found to delete`, 404);
  }

  // The delete did something, so return back an appropriate value.
  return success(ctx, `removed asset '${key}'`, {
    key,
    wasInDB: rowsDeleted !== 0,
    wasInBucket: bucketCheck !== null
  });
}


/******************************************************************************/
