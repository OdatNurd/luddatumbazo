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
  filename: z.string().optional()
});


/******************************************************************************/
