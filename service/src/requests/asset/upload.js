/******************************************************************************/


import { success, fail } from '#requests/common';

import { dbGameLookup } from "#db/game";
import { dbGameAssetUpload } from "#db/asset";


/******************************************************************************/


/* Handle a request to upload a new file and attach it to a specific game; the
 * game in question comes from the request URL, and the body of the request
 * carries information on the file to be uploaded and what name to store it
 * with. */
export async function reqGameAssetUpload(ctx) {
  const { idOrSlug } = ctx.req.valid('param');
  const { file, filename, description } = ctx.req.valid('form');

  // In order to construct the final asset key we need to verify that the game
  // we got is correct, since we need the slug to be valid.
  const gameInfo = await dbGameLookup(ctx, idOrSlug);
  if (gameInfo === null) {
    return fail(ctx, `invalid request: no such game '${idOrSlug}'`, 404);
  }

  // The name of the file that's being uploaded can be overridden in the body
  // of the request if we want the stored name of the file to be different than
  // the one that was used as a part of the bucket key.
  const uploadedFileName = filename || file.name;

  // The R2 key to store the file consists of a path that indicates that this is
  // a file associated with a game with a particular slug, followed by the
  // name of the file that's being uploaded.
  const key = `files/game/${gameInfo.slug}/${uploadedFileName}`;

  console.log(`incoming file is ${file.name} of type ${file.type}`);
  console.log(`storing '${uploadedFileName}' to '${key}'`);

  // Put the file into the bucket; this stores the mime type in the stored HTTP
  // metadata fields in the R2 object, and also includes as custom metadata the
  // fact that this file is a game related asset and the game that it's for.
  const result = await ctx.env.ASSETS.put(key, file, {
    'httpMetadata': { 'contentType': file.type },
    'customMetadata': {
      assetType: 'game',
      gameId: gameInfo.id,
      gameSlug: gameInfo.slug
    }
  });

  // If the add of the file to the bucket failed, return an error; we can get
  // no reason why the failure occured (though it would likely not be interesting
  // anyway).
  if (result === null) {
    return fail(ctx, `error while uploading the file data to the bucket`, 400);
  }

  // Record the upload in the database and return back the record for the asset.
  const asset = await dbGameAssetUpload(ctx, gameInfo.id, key, file.name, file.type, description);
  return success(ctx, `uploaded asset ${uploadedFileName}`, asset);
}


/******************************************************************************/
