/******************************************************************************/


import { raw, fetchVersion } from './fetch.js';
import { household } from './household.js';
import { game } from './game.js';
import { user } from './user.js';
import { session } from './session.js';
import { guest } from './guest.js';
import { metadata } from './metadata.js';
import { bgg } from './bgg.js';


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
  guest,
  bgg,
}


/* The update checker calls this separately from the composed API because it
 * must not inherit the API wrapper's 401 redirect behaviour. */
export { fetchVersion };


/******************************************************************************/
