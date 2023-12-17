/******************************************************************************/


import { cfImagesURLUpload } from '../db/common.js';
import { getTempImageList } from '../db/image.js';

import { success, fail } from "./common.js";


/******************************************************************************/


/* Looks up images in the temporary image URL collection (either a single one
 * or all of them, depending on the invocation path), and attempts to upload
 * the files for those games.
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
export async function tempImageDetailsReq(ctx) {
  // The request can optionally contain a BGG Game ID if the caller wants to
  // ingest just a single image instead of all of them.
  const { bggId } = ctx.req.param();

  // Fetch the list of images from the temporary collection; this will use the
  // provided game ID (if any) to find the records.
  const images = await getTempImageList(ctx, bggId);

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

