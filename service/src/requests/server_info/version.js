/******************************************************************************/


import { success } from '#requests/common';

import { commitReference } from '#commit';


/******************************************************************************/


/* Return back details on the commit and date that the back end worker component
 * was last deployed. */
export async function reqServerVersion(ctx) {
  return success(ctx, `server version details`, commitReference);
}



/******************************************************************************/
