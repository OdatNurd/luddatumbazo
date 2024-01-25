/******************************************************************************/


import { getDBResult } from '#db/common';


/******************************************************************************/


/* Search the database for the user with the given external ID; if such a user
 * is found, the full details object for that user is returned; otherwise, null
 * is returned instead. */
export async function findUserExternal(ctx, externalId) {
  const userLookup = await ctx.env.DB.prepare(`
    SELECT * FROM User WHERE externalId = ?
  `).bind(externalId).all();
  const userInfo = getDBResult('findUserExternal', 'find_user', userLookup);

  if (userInfo.length === 0) {
    return null;
  }

  return userInfo[0];
}


/******************************************************************************/


/* Search the database for the user with the given internal ID; if such a user
 * is found, the full details object for that user is returned; otherwise, null
 * is returned instead. */
export async function findUserInternal(ctx, userId) {
  const userLookup = await ctx.env.DB.prepare(`
    SELECT * FROM User WHERE id = ?
  `).bind(userId).all();
  const userInfo = getDBResult('findUserInternal', 'find_user', userLookup);

  if (userInfo.length === 0) {
    return null;
  }

  return userInfo[0];
}


/******************************************************************************/


/* This adds a new user to the database based on the details in the object
 * provided, which should include: [user_uuid, name, email],
 *
 * The new user will be inserted into the database using the next available
 * internal userId, and then returns an object that represents the new user. */
export async function insertUser(ctx, newUserInfo) {
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
  const newUser = getDBResult('insertUser', 'new_user', result);

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
