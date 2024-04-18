/******************************************************************************/


import { raw } from './fetch.js';


/******************************************************************************/


/* Gather the details on the currently logged in user.
 *
 * This returns core details on that user, as well as their household list and
 * a pulled out record that is the primary household of that user, if any. */
async function currentUser () {
  return raw.get(`/user/current`);
}


/******************************************************************************/


/* Export a composed object that collects the related API's together into a
 * single object based on the operations. */
export const user = {
  current: currentUser,
}


/******************************************************************************/
