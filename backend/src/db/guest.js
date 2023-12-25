/******************************************************************************/


import { ensureRequiredKeys, getDBResult } from './common.js';


/******************************************************************************/


/* Given a list of input guest data records, verify that the fields that must
 * exist are present, and fill in any of the optional fields that are not
 * there.
 *
 * A modified version of the list is returned that contains (potentially)
 * updated items, unless any one of them is invalid, in which case an exception
 * is thrown instead. */
const validateGuestData = guestData => guestData.map(guest => {
  // These keys must exist.
  if (ensureRequiredKeys(guest, ['firstName', 'lastName']) === false) {
    throw new Error(`guest list element is missing a requred field`)
  }

  // This key cannot exist because as a generated column outside code can't
  // specify the value); so fail if it is present, and set it otherwise.
  if (guest.name !== undefined) {
    throw new Error(`guest list entries cannot have an explicit name field`);
  }

  // Put the desired name in.
  guest.name = `${guest.firstName} ${guest.lastName}`;
  return guest;
});


/******************************************************************************/


/* This takes an array of guest user record objects and tries to insert records
 * for any guest user that does not already appear in the table. For our
 * purposes here, the first and last name fields uniquely identify a user.
 *
 * Any new guests will be added and any existing guests will be skipped over.
 *
 * The result is a list of objects, including their ID values, which exist. This
 * will include not only new users but also any that previously existed. */
export async function updateGuests(ctx, inputGuestList) {
  // Verify that all of the input data has the appropriate shape; throws an
  // exception if it does not.
  const guests = validateGuestData(inputGuestList);

  // Grab from the input list all of the names so we can see which ones already
  // exist in the table.
  const names = guests.map(el => el.name);

  // Query the database to see which of the included names already have entries
  // in the table; we don't want to try to insert those.
  const lookupExisting = ctx.env.DB.prepare(`
    SELECT id, firstName, lastName, name FROM GuestUser
    WHERE name IN (SELECT value from json_each('${JSON.stringify(names)}'))
  `);
  const existing = getDBResult('updateGuests', 'find_existing', await lookupExisting.all());

  // If we got the same number of items out as we put in, there's nothing new to
  // add so we can just return right now.
  if (names.length === existing.length) {
    return existing;
  }

  // Not all of the items exist; get the list of existing names so that we can
  // see what needs to be added.
  const existingNames = existing.map(el => el.name);

  // Gather from the input all of the recvords whose names don't appear in the
  // list of existing guests; these are the ones we need to add.
  const insertMetadata = guests.filter(el => existingNames.indexOf(el.name) === -1);

  // Construct an insert statement that we can use to insert a new record when
  // needed.
  const insertNew = ctx.env.DB.prepare(`INSERT INTO GuestUser VALUES(NULL, ?1, ?2)`);
  const insertBatch = insertMetadata.map(el => insertNew.bind(el.firstName, el.lastName));

  // If the batch is not empty, then we can execute to insert the new ones.
  // The batch returns an array of results, one per item in the input, but none
  // of them have any details since they are insert statements.
  if (insertBatch.length > 0) {
    const batched = await ctx.env.DB.batch(insertBatch);
    getDBResult('updateGuests', 'insert_guest', batched);
  }

  // Now look up all of the existing records based on the names we were given;
  // this will now be all of them.
  // TODO:
  //   To be more resource friendly, this could look up only those items whose
  //   slugs are in the insertMetadata list, and then combine them with the
  //   initial results, rather than re-scanning for items we already found.
  return getDBResult('updateGuests', 'final_lookup', await lookupExisting.all())
}


/******************************************************************************/


/* Query for the complete list of items of the given metadata type.
 *
 * This always results in a list of items, though that list may be empty.
 *
 * This may raise exceptions if there are issues talking to the database, or if
 * the metaType is not valid. */
export async function getGuestList(ctx, inputGuestList) {
  // Try to find all metadata item of this type.
  const guests = await ctx.env.DB.prepare(`
    SELECT id, firstName, lastName, name from GuestUser
  `).all();

  return getDBResult('getGuestList', 'find_guests', guests);
}


/******************************************************************************/


/* Delete from the Metadata list all of the metadata entries of the provided
 * metaType that are not being referenced by any game currently in the system.
 *
 * This may raise exceptions if there are issues talking to the database, or if
 * the metaType is not valid. */
export async function purgeUnusedGuests(ctx, doPurge) {
  // Find all of the unused guest entries
  const findSQL = `
    SELECT id, firstName, lastName, name FROM GuestUser
     WHERE id NOT IN
         (SELECT DISTINCT guestId FROM SessionReportPlayer WHERE guestId IS NOT NULL)
  `;

  // Find and remove all of the unused guest entries
  const purgeSQL = `
    DELETE FROM GuestUser
     WHERE id NOT IN
         (SELECT DISTINCT guestId FROM SessionReportPlayer WHERE guestId IS NOT NULL)
  `;

  // Select the appropriate statement depending on what we were asked to do.
  const stmt = (doPurge === true) ? purgeSQL : findSQL;
  const action = (doPurge === true) ? 'purge_guest' : 'find_guest';

  // Try to find all metadata item of this type.
  const guests = await ctx.env.DB.prepare(stmt).all();

  return getDBResult('purgeUnusedGuests', action, guests);
}


/******************************************************************************/

