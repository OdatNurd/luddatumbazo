/******************************************************************************/


import { dbUserDetails, dbUserInsert } from '#db/user';


/******************************************************************************/


/* A cache that maps the external identifier of a user to their internal userId.
 *
 * The external identifiers are invariant, so once a mapping has been seen it is
 * valid for the life of the isolate; invalidation of user access happens
 * upstream of us. This keeps the database lookups required to authorize a
 * request to a minimum. */
const userIdCache = {};


/******************************************************************************/


/* Given a normalized identity, return the internal userId of the user that it
 * represents.
 *
 * If the user is not known yet and provisioning is allowed (which is the case
 * for a user that has just logged in via the identity provider, and whose
 * profile we therefore know), a new user record is created for them on the fly;
 * this happens exactly once per user, on their first ever access.
 *
 * Identities that carry no profile details (such as the service token and
 * development token paths) can never provision; if the user does not already
 * exist the return value is null. */
export async function resolveUser(ctx, identity, provision = false) {
  // If this user is in the cache, then we can just return directly.
  const cached = userIdCache[identity.sub];
  if (cached !== undefined) {
    return cached;
  }

  // The user isn't in the cache yet, so look them up in the database based on
  // their external ID.
  let userInfo = await dbUserDetails(ctx, identity.sub);

  // If we don't find a user in the database, then we need to insert a new
  // record instead, but only for identities that we are allowed to provision.
  if (userInfo === null && provision === true) {
    console.log(`provisioning new user for external id ${identity.sub}`);
    userInfo = await dbUserInsert(ctx, identity);
  }

  if (userInfo === null) {
    console.log(`no user in database for external id ${identity.sub}`);
    return null;
  }

  // We either looked up a user, or we added one to the database. Either way,
  // update the cache and return the new ID.
  userIdCache[identity.sub] = userInfo.id;
  return userInfo.id;
}


/******************************************************************************/
