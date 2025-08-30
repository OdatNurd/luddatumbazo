/******************************************************************************/


import { success } from '#requests/common';

import { dbSessionGameTypes } from '#db/session';


/******************************************************************************/


/* Obtain the static list of game types to be used in session reporting to mark
 * in what manner the game recorded in the session was played.
 *
 * This provides information on the textual name of the game, the value to use
 * in session reports, and the icon to use to represent it. */
export async function reqSessionGameTypes(ctx) {
  const result = await dbSessionGameTypes(ctx);
  return success(ctx, `found information on ${result.length} game types`, result);
}


/******************************************************************************/

