/******************************************************************************/


import { success } from '#requests/common';

import { dbTempImageList, cfImagesURLUpload } from '#db/image';


/******************************************************************************/


/* This helper request looks up images in a table of the following description:
 *
 * CREATE TABLE TempGameImages (
 *     id     INTEGER PRIMARY KEY AUTOINCREMENT,
 *     gameId INTEGER,
 *     bggId  INTEGER,
 *     bggURL TEXT
 * );
 *
 * The request can take either a single bggId, or none to indicate that it
 * should search for all records.
 *
 * Each record will cause an upload of the image specified for the game with
 * the given ID. The bggId is used as a part of the metadata on the image.
 *
 * This is a production based API endpoint and is only here to help with bulk
 * back-fills of images when scaffolding out new installations.
 *
 * The result is a list of information on the uploaded images:
 *
 *   "result": [
 *      {
 *       "name": "games/game_1/poop.jpg",
 *       "meta": {
 *         "gameId": 1,
 *         "bggId": 7865,
 *         "originalURL": "https://cf.geekdo-images.com/B1Bji6N...../0x0/pic1229634.jpg"
 *       }
 *     }
 *   ] */
export async function reqImageUpload(ctx) {
  // The request can optionally contain a BGG Game ID if the caller wants to
  // ingest just a single image instead of all of them.
  const { bggId } = ctx.req.valid('param');

  // Fetch the list of images from the temporary collection; this will use the
  // provided game ID (if any) to find the records.
  const images = await dbTempImageList(ctx, bggId);

  // For each of the items that we found, perform the upload.
  const result = []
  for (const image of images)  {
    const data = await cfImagesURLUpload(ctx, image);
    result.push({
      name: data.id,
      meta: data.meta
    });
  }

  return success(ctx, `uploaded ${result.length} image(s)`, result);
}


/******************************************************************************/
