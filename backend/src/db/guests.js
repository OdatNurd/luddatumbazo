/******************************************************************************/


import { ensureRequiredKeys, getDBResult } from './common.js';


/******************************************************************************/


/* Given a list of input guest data records, for which the name fields must be
 * present (but the id not), verify that all such objects are of the correct
 * shape.
 *
 * This will throw an exception if that's not the case. */
const validateGuestData = guestData => guestData.forEach(guest => {
  if (ensureRequiredKeys(guest, ['firstName', 'lastName']) === false) {
    throw new Error(`guest list element is missing a requred field`)
  }
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
  validateGuestData(inputGuestList);

  throw new Error('not yet implemented');

  // Query the database to find all of the existing guest users. This is kind of
  // heavy handed, but since we want to insert only those that don't exist.
  // Query the database to see which of the included slugs already have entries
  // in the table; we don't want to try to insert those.
  const lookupExisting = ctx.env.DB.prepare(`
    SELECT id, bggId, name, slug from GameMetadata
    WHERE metatype = ? AND slug in (SELECT value from json_each('${JSON.stringify(slugs)}'))
  `).bind(metaType);
  const existing = getDBResult('updateMetadata', 'find_existing', await lookupExisting.all());

  // If the result that came back has the same length as the list of slugs,
  // then all of the items are already in the database, so there's no reason to
  // do anything and we can just return right now.
  if (slugs.length === existing.length) {
    return existing;
  }

  // Not all of the items exist; get the list of existing slugs so that we can
  // see what needs to be added.
  const existingSlugs = existing.map(el => el.slug);

  // Gather from the input metadata all of the records whose slugs don't appear
  // in the list of existing slugs; those are the items that we need to insert
  // records for.
  const insertMetadata = metadata.filter(el => existingSlugs.indexOf(el.slug) === -1);

  // Construct an insert statement that we can use to insert a new record when
  // needed.
  const insertNew = ctx.env.DB.prepare(`INSERT INTO GameMetadata VALUES(NULL, ?1, ?2, ?3, ?4)`);
  const insertBatch = insertMetadata.map(el => insertNew.bind(metaType, el.bggId, el.slug, el.name));

  // If the batch is not empty, then we can execute to insert the new ones.
  // The batch returns an array of results, one per item in the input, but none
  // of them have any details since they are insert statements.
  if (insertBatch.length > 0) {
    const batched = await ctx.env.DB.batch(insertBatch);
    getDBResult('updateMetadata', 'insert_meta', batched);
  }

  // Now look up all of the existing records based on the slugs we were given;
  // this will now be all of them.
  // TODO:
  //   To be more resource friendly, this could look up only those items whose
  //   slugs are in the insertMetadata list, and then combine them with the
  //   initial results, rather than re-scanning for items we already found.
  return getDBResult('updateMetadata', 'final_lookup', await lookupExisting.all())
}


/******************************************************************************/


/* Query for the complete list of items of the given metadata type.
 *
 * This always results in a list of items, though that list may be empty.
 *
 * This may raise exceptions if there are issues talking to the database, or if
 * the metaType is not valid. */
export async function getGuestList(ctx, metaType) {
  // Try to find all metadata item of this type.
  const guests = await ctx.env.DB.prepare(`
    SELECT id, firstName, lastName from GuestUser
  `).all();

  return getDBResult('getGuestList', 'find_guests', guests);
}


/******************************************************************************/


/* Delete from the Metadata list all of the metadata entries of the provided
 * metaType that are not being referenced by any game currently in the system.
 *
 * This may raise exceptions if there are issues talking to the database, or if
 * the metaType is not valid. */
export async function purgeGuests(ctx, inputGuestList) {
  throw new Error('not yet implemented');

  // Try to find all metadata item of this type.
  const metadata = await ctx.env.DB.prepare(stmt).bind(metaType).all();

  return getDBResult('purgeUnusedMetadata', action, metadata);
}


/******************************************************************************/

