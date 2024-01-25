/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, success, fail } from '#requests/common';

import { getAuthorizedUser } from '#lib/auth';


/******************************************************************************/


/* This request checks the authorization header on the request, validates it,
 * and returns back an object that represents the currently logged in user.
 *
 * If the user does not appear in the database, then an attempt is made to add
 * that user to the database using their current session data.
 *
 * The return is either an object that represents the authorized user's details,
 * or an error if the user is not authorized. */
async function getCurrentUserReq(ctx) {
  const userDetails = await getAuthorizedUser(ctx);
  if (userDetails === null) {
    return fail(ctx, `not authorized`, 403);
  }

  return success(ctx, `authorized`, userDetails);
}


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const auth = new Hono();


auth.get('/', ctx => _(ctx, getCurrentUserReq));


/******************************************************************************/
