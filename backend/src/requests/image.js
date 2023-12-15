/******************************************************************************/


import { BGGLookupError } from '../db/exceptions.js';
import { success, fail } from "./common.js";

import { getTempImageList } from '../db/image.js';


/******************************************************************************/


/* This takes an existing URL for some image (say from BGG), an asset type that
 * represents what the image is for (say "game"), and the base name that the
 * file should have.
 *
 * The return value is a custom path to use as a part of a Cloudflare Image
 * upload.
 *
 * The filename returned will be namespaced based on the current project as well
 * as the asset type given. The filename will use the base name provided and the
 * extension that was on the original URL (if any), so that the resulting file
 * can be disambiguated from other images in other projects while still having
 * the appropriate type. */
function getImageAssetPath(baseURL, assetType, baseName) {
  // Parse the incoming URL and split the pathname part based on a period to
  // try and get the extension.
  const parts = new URL(baseURL).pathname.split('.');

  // The extension of the file is the last item in the list, so long as there
  // are more than one item; if there's only one, the file had no extension,
  // and if there's more than one, the filename had periods in it because
  // someone is a bad, bad man (or woman).
  const ext = (parts.length > 1) ? `.${parts.at(-1)}` : '';

  // Return the full filename now.
  return `luddatumbazo/${assetType}/${baseName}${ext}`;
}


/******************************************************************************/


/* Given an image record of the form:
 *   {
 *     "id": 1,
 *     "gameId": 1,
 *     "bggId": 7865,
 *     "bggURL": "https://cf.geekdo-images.com/B1Bji6N...../0x0/pic1229634.jpg"
 *   }
 *
 * This will attempt to insert into the configured images system the image from
 * the provided URL.
 *
 * The internal gameID, bggGameID and the original source image are stored in
 * the metadata for the uploaded image.
 *
 * If there is an error, this will raise an exception; otherwise the return
 * value is the return from Cloudflare.
 *
 * The important part of the return is:
 *   "result": {
 *       "id": "games/game_1/poop.jpg",
 *       "meta": {
 *         "gameId": 1,
 *         "bggId": 7865,
 *         "originalURL": "https://cf.geekdo-images.com/B1Bji6N...../0x0/pic1229634.jpg"
 *       }
 *   }
 *
 * The custom id is used as a part of the image URL to serve the image. */
async function cfImagesURLUpload(ctx, image) {
  // The URI to upload a file must contain our Cloudflare Account ID.
  const uploadURI = `https://api.cloudflare.com/client/v4/accounts/${ctx.env.CF_ACCOUNT_ID}/images/v1`

  // Using the original BGG URL, create the full path to the file that we will
  // serve the image from under our own domain.
  const uploadPath = getImageAssetPath(image.bggURL, 'game', `game${image.gameId}`);

  // Store in the image metadata information about where the image came from and
  // what it represents.
  const metadata = {
    project: 'luddatumbazo',
    assetType: 'game',
    gameId: image.gameId,
    bggId: image.bggId,
    originalURL: image.bggURL
  }

  // Prepare the form body to tell Cloudflare what image to load and what name
  // to give it.
  const body = new FormData();
  body.append("metadata", JSON.stringify(metadata));
  body.append("url", image.bggURL);
  body.append("id", uploadPath);

  // To upload the image we need to create an authorized POST request with the
  // form body that indicates where the data should come from.
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.env.CF_IMAGES_TOKEN}`
    },
    body
  };

  // Request that Cloudflare ingest the image; this will only reject if there is
  // a network issue, which will be caught by the caller.
  const res = await fetch(uploadURI, options);
  const result = await res.json();

  // If the request failed, gather all of the error messages and use them to
  // raise an error to the caller.
  if (res.ok === false) {
    const errors = result.errors.map(el => el.message).join(', ');
    throw new BGGLookupError(`unable to upload image: ${errors}`, res.status);
  }

  // Return the appropriate data back.
  return result.result;
}


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

