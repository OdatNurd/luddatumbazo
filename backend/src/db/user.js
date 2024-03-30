/******************************************************************************/


import { getDBResult } from '#db/common';


/******************************************************************************/


/* Given a userId, return all of the households that that user belongs to; this
 * may be an empty list.
 *
 * The list may also contain a single household which is marked as the primary,
 * although this is also not a requirement. */
export async function dbUserHouseholds(ctx, userId) {
  const householdLookup = await ctx.env.DB.prepare(`
    SELECT A.*, B.isPrimary
      FROM Household as A, UserHousehold as B
     WHERE A.id = B.householdId
       AND B.userId = ?
  `).bind(userId).all();

  return getDBResult('dbUserHouseholds', 'find_households', householdLookup);
}


/******************************************************************************/


/* Given a userInfo record, look up and attach to it the list of households the
 * user is a part of, as well as an alias for the primary household (if any).
 *
 * If the provided value is undefined or null, null is returned back and no
 * further action is taken. */
async function addHouseholds(ctx, userInfo) {
  // If we got no user, return back directly.
  if (userInfo === null || userInfo === undefined) {
    return null;
  }

  // Look up the list of households this user is a part of.
  const households = await dbUserHouseholds(ctx, userInfo.id);

  // Set in the primary (if any), and the overall list.
  userInfo.household = households.find(h => h.isPrimary === 1) ?? null;
  userInfo.households = households

  return userInfo;
}


/******************************************************************************/


/* Search the database for the user with the given external ID; if such a user
 * is found, the full details object for that user is returned; otherwise, null
 * is returned instead. */
async function findUserExternal(ctx, externalId, includeHouseholds) {
  // If not specified, do not include households.
  includeHouseholds ??= false;

  const userLookup = await ctx.env.DB.prepare(`
    SELECT id, firstName, lastName, displayName, name, emailAddress
      FROM User
     WHERE externalId = ?
  `).bind(externalId).all();
  const userInfo = getDBResult('findUserExternal', 'find_user', userLookup);

  // If we're not supposed to include households, then we are done.
  if (includeHouseholds === false) {
    return userInfo[0] ?? null;
  }

  // Look up and include household information.
  return addHouseholds(ctx, userInfo[0]);
}


/******************************************************************************/


/* Search the database for the user with the given internal ID; if such a user
 * is found, the full details object for that user is returned; otherwise, null
 * is returned instead. */
async function findUserInternal(ctx, userId, includeHouseholds) {
  // If not specified, do not include households.
  includeHouseholds ??= false;

  const userLookup = await ctx.env.DB.prepare(`
    SELECT id, firstName, lastName, displayName, name, emailAddress
      FROM User
     WHERE id = ?
  `).bind(userId).all();
  const userInfo = getDBResult('findUserInternal', 'find_user', userLookup);

  // If we're not supposed to include households, then we are done.
  if (includeHouseholds === false) {
    return userInfo[0] ?? null;
  }

  // Look up and include household information.
  return addHouseholds(ctx, userInfo[0]);
}


/******************************************************************************/


/* Given a user identifier that is either a number that is an internal userId or
 * a string which is an external userId, attempt to look up and return the user
 * record associated with that user.
 *
 * The return value in either case is always either a user record or null,
 * depending on the state of the lookup. */
export async function dbUserDetails(ctx, identifier, includeHouseholds) {
  if (typeof identifier === "number") {
    return findUserInternal(ctx, identifier, includeHouseholds);
  } else {
    return findUserExternal(ctx, identifier, includeHouseholds);
  }
}


/******************************************************************************/


/* This adds a new user to the database based on the details in the object
 * provided, which should include: [user_uuid, name, email],
 *
 * The new user will be inserted into the database using the next available
 * internal userId, and then returns an object that represents the new user. */
export async function dbUserInsert(ctx, newUserInfo) {
  // Split the single name value into a first and last name; naively the first
  // word becomes the first name, and the remainder is the last name.
  const nameParts = newUserInfo.name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  // Insert the new record in; the inco,ing name is used as the display name
  // because the actual name field is a generated column.
  const result = await ctx.env.DB.prepare(`
    INSERT INTO User
       (externalId, firstName, lastName, displayName, emailAddress)
       VALUES (?1, ?2, ?3, ?4, ?5)
  `).bind(newUserInfo.user_uuid,
          firstName, lastName,
          newUserInfo.name,
          newUserInfo.email).all();
  const newUser = getDBResult('dbUserInsert', 'new_user', result);

  // Return an object back that mimics what the actual result from the
  // database would be; for this we need to check the metadata on the DB query
  // to know what the inserted ID value was.
  return {
    id: result.meta.last_row_id,
    externalId: newUserInfo.user_uuid,
    firstName,
    lastName,
    displayName: newUserInfo.name,
    name: newUserInfo.name,
    email: newUserInfo.email
  }
}


/******************************************************************************/


/* Search for and return a list of all of the users that are known to the
 * system.
 *
 * This provides a subset of potential user information, since some fields are
 * meant for internal use only. */
export async function dbUserList(ctx) {
  const result = await ctx.env.DB.prepare(`
    SELECT id, name, displayName, emailAddress From User
  `).all();
  return getDBResult('dbUserList', 'list_users', result);
}


/******************************************************************************/
