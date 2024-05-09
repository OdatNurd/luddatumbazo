/******************************************************************************/


import { raw } from './fetch.js';


/******************************************************************************/


/* Gather the details on the back end server
 *
 * This returns back information on the date, time and commit under which the
 * most recent server side deployment was completed. */
async function serverVersion () {
  return raw.get(`/server_info/version`);
}


/******************************************************************************/


/* Export a composed object that collects the related API's together into a
 * single object based on the operations. */
export const server = {
  version: serverVersion,
}


/******************************************************************************/
