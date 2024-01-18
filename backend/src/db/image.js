/******************************************************************************/


import { getDBResult } from '#db/common';


/******************************************************************************/


/* Query to get the list of temporary images that are stored in the database,
 * optionally constraining the result to a specific BGG game ID.
 *
 * This always results in a list of items, though that list may be empty.
 *
 * This may raise exceptions if there are issues talking to the database, or if
 * the metaType is not valid. */
export async function getTempImageList(ctx, bggId) {
  let stmt = null;
  if (bggId === undefined) {
    stmt = ctx.env.DB.prepare(`SELECT * FROM TempGameImages`);
  } else {
    stmt = ctx.env.DB.prepare(`SELECT * FROM TempGameImages WHERE bggId = ?`)
                     .bind(bggId);
  }

  const data = await stmt.all();
  return getDBResult(`getTempImageList`, 'find_image', data);
}


/******************************************************************************/
