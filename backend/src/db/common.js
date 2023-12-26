/******************************************************************************/


import { BGGLookupError } from '../db/exceptions.js';


/******************************************************************************/


/* This maps our own internal name for image variants to the variants that
 * should be actually used as a part of the expansion.
 *
 * The keys in this list are the internal string names for the image types that
 * we want to use, and the values are the names of the environment variables
 * that tell us what names to use. */
const variantMap = {
  'boxart': 'CF_VARIANT_BOXART',
  'smallboxart': 'CF_VARIANT_SMALLBOXART',
  'thumbnail': 'CF_VARIANT_THUMB',
}


/******************************************************************************/


/* Given an object and an array of keys, ensure that each of the keys in the
 * list appear in the object.
 *
 * The return value is false if any keys are missing and true if all are
 * present. */
export const ensureRequiredKeys = (obj, keys) => {
  for (const key of keys) {
    if (obj[key] === undefined) {
      return false
    }
  }
  return true;
}


/******************************************************************************/


/* Given a base object and an object that has default values within it, return
 * a version of the object back where any of the missing optional fields are
 * populated with the default values. */
export const ensureDefaultValues = (obj, defaults) => {
  const details = { ...defaults };
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      details[key] = value;
    }
  }

  return details;
}


/******************************************************************************/


/* Given an input object, verify that all of the fields with required values
 * exist within the object; if any are missing, raise an error.
 *
 * Once that is done, the defaults from the defaultValues object (if any) are
 * applied so that any fields that are optional will have known good default
 * values.
 *
 * The return value is a version of the input object which has been validated
 * and whose missing optional fields are populated with the defaults. */
export const ensureObjectStructure = (inputObj, requiredFields, defaultValues) => {
  defaultValues ??= {};

  // Ensure that the input object has all of the fields that are required; for
  // any that are missing, raise an error.
  for (const key of requiredFields) {
    if (inputObj[key] === undefined) {
      throw new Error(`required field '${key}' missing in the input data`);
    }
  }

  // Populate any missing fields with their defaults and return the result.
  return ensureDefaultValues(inputObj, defaultValues);
}


/******************************************************************************/


/* Given an object, find all of the keys in the object that appear like they are
 * supposed to be booleans based on their name and return the list of them, if
 * any, back. */
const getBoolNamedKeys = inputObj => Object.keys(inputObj).filter(k => k.match(/^is[A-Z]/));


/******************************************************************************/


/* Given an object, convert all of the fields with boolean names from integers
 * to booleans.
 *
 * The passed in object is returned back after being modified. */
export const mapIntFieldsToBool = inputObj => {
  for (const key of getBoolNamedKeys(inputObj)) {
    inputObj[key] = inputObj[key] !== 0;
  }
  return inputObj;
}


/******************************************************************************/


/* Given an object, convert all of the fields with boolean names from booleans
 * to integers.
 *
 * The passed in object is returned back after being modified. */
export const mapBoolFieldsToInt = inputObj => {
  for (const key of getBoolNamedKeys(inputObj)) {
    inputObj[key] = inputObj[key] ? 1 : 0;
  }
  return inputObj;
}


/******************************************************************************/


/* Given some information on where and what database action is taken, what the
 * result was, and whether or not it is a batch, display a log that displays
 * details of the operation. */
const displayDBResultLog = (where, action, result, isBatch) => {
  // The locus that this operation happened at.
  const locus = `${where}:${action}`;

  // Alias the result meta section for easier access
  const m = result.meta;

  // When the log is the result of a batch, we want a bit of a visual separation
  // in the output to show that.
  const sep = isBatch ? '  =>' : '';

  // Gather the duration of the operation, whether or not i was a success, and
  // some information on the underlying data.
  //
  // Since Cloudflare are dicks, the result set doesn't match the docs when you
  // do local dev, so we need to patch that in so that stuff doesn't blow up in
  // our faces.
  const duration = `[${m.duration}ms]`;
  const status = `${result.success ? 'success' : 'failure'}`;
  const stats = `last_row_id=${m.last_row_id}, reads=${m.rows_read ?? '?'}, writes=${m.rows_written ?? '?'}`

  // Gather the size of the result set; this can be null, in which case report
  // that instead.
  const count = `, resultSize=${result.results !== null ? result.results.length : 'null'}`
  console.log(`${duration} ${sep} ${locus} : ${m.served_by}(${status}) : ${stats}${count}`);
}


/******************************************************************************/


/* This helper plucks the results out of a D1 result set and returns them while
 * also making a log entry on the number of reads and writes to the database,
 * as well as whether the operation succeeded or failed and how long it took.
 *
 * The results parameter is the result of calling one of:
 *   run(), all() or batch()
 *
 * This call will detect if the results passed in is an array or not; if it is,
 * then it's assumed this is being used to report the output of a batched call,
 * in which case the returned result is a mapped version that provides an array
 * of results. */
export const getDBResult = (where, action, resultSet) => {
  // If the result set is an array, then this is a batch operation, so we need
  // to generate a log once for each item in the batch, and then adjust the
  // result set so that it's an array of results and not an array of D1 info
  if (Array.isArray(resultSet)) {
    for (const item of resultSet) {
      displayDBResultLog(where, action, item, true);
    }

    // Unfold the results on return
    return resultSet.map(item => item.results);
  }

  // Just a single result set, so log it and return the inner results back.
  displayDBResultLog(where, action, resultSet, false);
  return resultSet.results;
}


/******************************************************************************/



/* This takes as a argument an asset path from a database record that represents
 * an image and an image variant name, and returns back the full URL to the
 * image for that variant that allows it to be displayed.
 *
 * Since many image assets are optional, this will gracefully return the input
 * value if it is not set. It will however throw an exception if the image
 * variant requested is not valid. */
export function getImageAssetURL(ctx, assetPath, imageVariant) {
  // Images are optional; don't try to do anything fancy if there is no image.
  if (assetPath === '') {
    return assetPath;
  }

  // Look up the image variant we were given to see what environment variable
  // we should look in; fail if this does not map.
  const variantEnvName = variantMap[imageVariant];
  if (variantEnvName === undefined) {
    throw new Error(`unknown image variant '${imageVariant}`);
  }

  // Look up the actual variant name by using the environment; fail if the
  // variable is not set.
  const variant = ctx.env[variantEnvName];
  if (variant === undefined) {
    throw new Error(`environment variable '${variantEnvName}' is not set`);
  }

  // Parse the incoming asset path to get at the root URL;  verify that the
  // protocol is what we expect; we will ultimately support multiple image
  // back ends.
  const url = new URL(assetPath);
  if (url.protocol !== 'cfi:') {
    throw new Error(`unknown image storage format ${url.protocol}`);
  }

  // The imagePath is the path portion of the URL, except that it has a leading
  // slash on it, which we want to get rid of.
  const imagePath = url.pathname.substr(1);

  // Get the image URL template for Cloudflare images out of the environment
  // and then replace our template variables into it.
  let imageUrl = ctx.env.CF_IMAGEURL_TEMPLATE;
  imageUrl = imageUrl.replace('{imagePath}', imagePath);
  imageUrl = imageUrl.replace('{variant}', variant);

  return imageUrl;
}


/******************************************************************************/


/* This takes as an argument an array of objects which have at their inputKey
 * a value that should be transformed into an asset url via getAssetURL into
 * a field named outputKey and returns back a list of items so modified.
 *
 * The input key will be removed and replaced with the mapped output key. */
export function mapImageAssets(ctx, data, inputKey, imageVariant) {
  return data.map(item => {
    item[inputKey] = getImageAssetURL(ctx, item[inputKey], imageVariant);
    return item;
  });
}


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
export async function cfImagesURLUpload(ctx, image) {
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
