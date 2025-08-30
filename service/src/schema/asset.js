/******************************************************************************/


import { z } from 'zod';


/******************************************************************************/


/* When uploading assets, the body of the form request should include fields
 * such as the following to specify the file that's being uploaded and how to
 * represent it internally. */
export const AssetUploadSchema = z.object({
  // This field is expected to be a File, which only happens during a form
  // upload with a file input in it.
  file: z.instanceof(File),
  description: z.string(),
  filename: z.string().optional()
});


/******************************************************************************/


/* When deleting assets, the body should contain the key to delete; there is
 * no specification for what the asset may be attached to (e.g. a game) since
 * the key is unique already. */
export const AssetDeleteSchema = z.object({
  key: z.string()
});



/******************************************************************************/
