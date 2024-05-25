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
