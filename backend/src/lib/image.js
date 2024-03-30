
/******************************************************************************/


/* This maps our own internal name for image variants to the variants that
 * should be actually used as a part of the expansion.
 *
 * The keys in this list are the internal string names for the image types that
 * we want to use, and the values are the names of the environment variables
 * that tell us what names to use. */
export const imageVariantMap = {
  'boxart': 'CF_VARIANT_BOXART',
  'smallboxart': 'CF_VARIANT_SMALLBOXART',
  'thumbnail': 'CF_VARIANT_THUMB',
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
  const variantEnvName = imageVariantMap[imageVariant];
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
 * a value that should be transformed into an asset URL via getAssetURL into
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
export function getImageAssetPath(baseURL, assetType, baseName) {
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
