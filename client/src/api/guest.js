/******************************************************************************/


import { raw } from './fetch.js';


/******************************************************************************/


/* Gather the list of all guest players known to the system. Guests are people
 * that play games but do not have accounts, and they are de-duplicated by
 * their first and last names, so the same guest shows up exactly once.
 *
 * The result is a list of short guest records (id, names and display name),
 * which is used to let a session report pick people that have played before
 * while still allowing brand new guests to be named. */
async function guestList() {
  return raw.get('/guest/list');
}


/******************************************************************************/


/* Export a composed object that collects the related API's together into a
 * single object based on the operations. */
export const guest = {
  list: guestList,
}


/******************************************************************************/
