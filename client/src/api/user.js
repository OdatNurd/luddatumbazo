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


/* Gather the short records for every user known to the system; this is used
 * where people need to be picked (such as the players of a session report). */
async function userList () {
  return raw.get(`/user/list`);
}


/******************************************************************************/


/* Export a composed object that collects the related API's together into a
 * single object based on the operations. */
export const user = {
  current: currentUser,
  list: userList,
}


/******************************************************************************/
