/******************************************************************************/


/* This maps our own internal name for image variants to the variants that
 * should be actually used as a part of the expansion.
 *
 * The keys in this list are the internal string names for the image types that
 * we want to use, and the values are the names of the environment variables
 * that tell us what names to use. */
const variantMap = {
  'boxart': 'CF_VARIANT_BOXART',
  'thumbnail': 'CF_VARIANT_THUMB'
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
