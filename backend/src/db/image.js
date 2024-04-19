/******************************************************************************/


import { getDBResult } from '#db/common';
import { BGGLookupError } from '#db/exceptions';

import { imgConstructAssetPath, imageVariantMap } from '#lib/image';


/******************************************************************************/


/* Obtain the URI that is used to access the Cloudflare Images API; this is the
 * same URI for everything, but requires some runtime introspection because it
 * contains an account ID which is configured at runtime. */
const imagesURI = ctx => `https://api.cloudflare.com/client/v4/accounts/${ctx.env.CF_ACCOUNT_ID}/images/v1`;


/******************************************************************************/


/* Given an image record that would be passed to cfImagesURLUpload() in order
 * to upload an image, check with CloudFlare to see if such an image already
 * exists in the image list or not.
 *
 * If it does, an object that represents the upstream information on the image
 * will be returned back. This includes the original filename and URL, the list
 * of variants, as well as the metadata associated with the image.
 *
 * If there is no such image, null is returned back. */
export async function cfImagesLookup(ctx, image) {
  // Determine what the internal name for the image provided would be, if we
  // were to upload it.
  const uploadPath = imgConstructAssetPath(image.bggURL, 'game', `game${image.gameId}`);

  // TO fetch details about the image, we need to create an authorized GET
  // request with our images token.
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ctx.env.CF_IMAGES_TOKEN}`
    }
  };

  // Request that Cloudflare tell us information about the image; this will only
  // reject if there is a network issue, which will be caught by the caller.
  const res = await fetch(`${imagesURI(ctx)}/${uploadPath}`, options);
  const result = await res.json();

  // If the request failed, gather all of the error messages and use them to
  // raise an error to the caller.
  if (res.ok === false) {
    const errors = result.errors.map(el => el.message).join(', ');
    throw new BGGLookupError(`unable to find details on existing image: ${errors}`, res.status);
  }

  // Return the appropriate data back.
  return result.result;
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
export async function cfImagesURLUpload(ctx, image, checkForExisting) {
  // Before we attempt to upload the image, if we were requested to do so, then
  // attempt to check to see if the image already exists prior to uploading it.
  if (checkForExisting === true) {
    try {
      return await cfImagesLookup(ctx, image);
    }
    catch (error) {
      console.log(`existing image for ${image.gameId} was not found; uploading`);
    }
  }

  // Using the original BGG URL, create the full path to the file that we will
  // serve the image from under our own domain.
  const uploadPath = imgConstructAssetPath(image.bggURL, 'game', `game${image.gameId}`);

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
  const res = await fetch(imagesURI(ctx), options);
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


/* Fetch out to Cloudflare images to get the list of known variants, and then
 * use that information in combination with our configured list of image types
 * to return back an array of objects which include the name of the image type
 * and the dimensions that can be expected out of images of that type.
 *
 * This will raise an exception if any configured internal image type does not
 * map to an external variant. */
export async function cfImagesGetVariants(ctx) {
  // The URI uses to talk to the CloudFlare Images API; it requires our Account
  // ID.
  const variantURI = `${imagesURI(ctx)}/variants`;

  // To obtain the list of image variants we need to create an authorized GET
  // request.
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ctx.env.CF_IMAGES_TOKEN}`
    }
  };

  // Fetch the list of variants. This will only reject if there is a network
  // issue, which will be caught by the caller.
  const res = await fetch(variantURI, options);
  const lookup = await res.json();

  // If the request failed, gather all of the error messages and use them to
  // raise an error to the caller.
  if (res.ok === false) {
    const errors = lookup.errors.map(el => el.message).join(', ');
    throw new BGGLookupError(`unable to fetch image variants: ${errors}`, res.status);
  }

  // The request suceeded, so pull out of the lookup, the variants. This is an
  // array of objects with an 'id' that is the variant name, and the properties
  // of the variant.
  const variants = Object.values(lookup.result.variants);

  // Fetch our result; for each of the internal image names, look up the
  // external name in the environment and use that to find the entry in the
  // variant list to get the variant details.
  const result = Object.keys(imageVariantMap).map(internalName => {
    const variantId = ctx.env[imageVariantMap[internalName]];
    const variantInfo = variants.find(el => el.id == variantId);

    // Sanity check that the configuration in the wrangler file specifies a
    // variant that actually exists.
    if (variantInfo === undefined) {
      throw new BGGLookupError(`unknown internal image variant ${internalName}`, 400);
    }

    return {
      "name": internalName,
      "width": variantInfo.options.width,
      "height": variantInfo.options.height
    }
  });

  return result;
}


/******************************************************************************/


/* Query to get the list of temporary images that are stored in the database,
 * optionally constraining the result to a specific BGG game ID.
 *
 * This always results in a list of items, though that list may be empty.
 *
 * This may raise exceptions if there are issues talking to the database, or if
 * the metaType is not valid. */
export async function dbTempImageList(ctx, bggId) {
  let stmt = null;
  if (bggId === undefined) {
    stmt = ctx.env.DB.prepare(`SELECT * FROM TempGameImages`);
  } else {
    stmt = ctx.env.DB.prepare(`SELECT * FROM TempGameImages WHERE bggId = ?`)
                     .bind(bggId);
  }

  const data = await stmt.all();
  return getDBResult(`dbTempImageList`, 'find_image', data);
}


/******************************************************************************/
