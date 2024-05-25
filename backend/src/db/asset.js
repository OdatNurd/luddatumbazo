/******************************************************************************/


import { getDBResult } from '#db/common';


/******************************************************************************/


/* Given some core information on a file asset that has been added to the R2
 * bucket, record the asset in the database with the details provided.
 *
 * If an entry already exists with the given r2Key, the entry in the database
 * will be updated with the new details.
 *
 * The record will be stamped with the current date and time when the upload
 * occurs; the time is used as an update if the key was previously used.
 *
 * Details on the new or updated key are returned back. */
export async function dbGameAssetUpload(ctx, gameId, r2Key, filename, mimetype) {
  // Calculate the current time, to be used as a timestamp for the creation or
  // update as appropriate.
  const timestamp = new Date().toISOString();

  // We need to do the update as a sequence of two queries.
  const result = await ctx.env.DB.batch([
    // Attempt to insert the new record; if the bucket key was already in use
    // then update the existing record with the new data instead.
    ctx.env.DB.prepare(`
      INSERT INTO GameAssets (gameId, mimetype, filename, createdAt, bucketKey)
      VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(bucketKey) DO UPDATE
        SET gameId = excluded.gameId,
            mimetype = excluded.mimetype,
            filename = excluded.filename,
            updatedAt = excluded.createdAt;
    `).bind(gameId, mimetype, filename, timestamp, r2Key),

    // Fetch the record that we just inserted or updated
    ctx.env.DB.prepare(`
      SELECT * FROM GameAssets WHERE bucketKey = ?
    `).bind(r2Key)
  ]);

  return getDBResult('dbGameAssetInsert', 'record_asset', result)[1];
}


/******************************************************************************/


/* Return back a list of all of the assets associated with the game with the
 * given internal ID, or if the gameId is undefined, all assets in the list.
 *
 * In either case, the result may be an empty list, but it will always be a
 * list. */
export async function dGameAssetList(ctx, gameId) {
  let stmt, op;
  if (gameId === undefined) {
    op = 'find_all_assets';
    stmt = ctx.env.DB.prepare(`
      SELECT * FROM GameAssets
    `);
  } else {
    op = 'find_game_assets';
    stmt = ctx.env.DB.prepare(`
      SELECT * FROM GameAssets
      WHERE gameId = ?
    `).bind(gameId);
  }

  const result = await stmt.all();
  return getDBResult('dbGameAssetList', op, result);
}


/******************************************************************************/


/* Try to delete from the list of assets the item with the provided key; since
 * the key is unique, no other information is required in order to find the
 * record.
 *
 * The return value is the number of rows that were deleted, which is either 0
 * or 1. */
export async function dbAssetDelete(ctx, key) {
  const result = await ctx.env.DB.prepare(`
    DELETE FROM GameAssets
    WHERE bucketKey = ?
  `).bind(key).all();

  return result.meta.changes;
}


/******************************************************************************/
