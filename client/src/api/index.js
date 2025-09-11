/******************************************************************************/


import { raw } from './fetch.js';
import { household } from './household.js';
import { game } from './game.js';
import { user } from './user.js';
import { session } from './session.js';
import { metadata } from './metadata.js';


/******************************************************************************/


/* Export a composed API that includes all of the namespaces sub-API items that
 * we imported above. */
export const api = {
  raw,
  user,
  household,
  game,
  metadata,
  session,
}


/******************************************************************************/
