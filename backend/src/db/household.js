/******************************************************************************/


import { getDBResult } from '#db/common';
import { getHouseholdUsers } from '#db/userhousehold';
import { getGameHouseholdDetails } from '#db/game';


/******************************************************************************/


/* Return details on the household with the provided identifier or textual
 * slug; if such a household is not found, null is returned. Otherwise, the
 * result is information on that particular household. */
export async function getHouseholdDetails(ctx, idOrSlug) {
  const householdLookup = await ctx.env.DB.prepare(`
    SELECT * FROM Household
     WHERE (id == ?1 or slug == ?1)
  `).bind(idOrSlug).all();
  const householdInfo = getDBResult('getHouseholdDetails', 'find_household', householdLookup);

  // If that returned no results, we can leave now.
  if (householdInfo.length === 0) {
    return null;
  }

  // Collect the household and gather into it all users that exist within it.
  const household = householdInfo[0];
  household.users = await getHouseholdUsers(ctx, household.id)

  return household;
}


/******************************************************************************/


/* Search for and return a list of all of the households that are known to the
 * system. */
export async function getHouseholdList(ctx) {
  const result = await ctx.env.DB.prepare(`
    SELECT * FROM Household
  `).all();
  return getDBResult('getHouseholdList', 'list_households', result);
}


/******************************************************************************/


/* Given a household, and the ID information for an interrelated set of game,
 * name record and publisher, insert a record into the ownership table for
 * this game.
 *
 * This does not validate that the game has a name with the ID provided, or that
 * the publisher provided is a publisher of the game; it is assumed this has
 * been pre-validated. */
export async function addGameToHousehold(ctx, householdId, gameId, nameId, publisherId) {
  const result = await ctx.env.DB.prepare(`
    INSERT INTO GameOwners
      (householdId, gameId, gameName, gamePublisher)
    VALUES (?1, ?2, ?3, ?4);
    `).bind(householdId, gameId, nameId, publisherId).all();

  getDBResult('addGameToHousehold', 'insert', result);

  // TODO: This is wasteful; it does not need to pull the wishlist data if we
  //       only want ownership data.
  return (await getGameHouseholdDetails(ctx, { id: gameId }, householdId)).owned;
}



/******************************************************************************/


/* Given a household, and the ID information for a game, remove that record from
 * the database.
 *
 * This does not validate that such an entry exists in the database; it only
 * purges the entry if it happens to exist. */
export async function removeGameFromHousehold(ctx, householdId, gameId) {
  const result = await ctx.env.DB.prepare(`
    DELETE FROM GameOwners
     WHERE householdId = ?1 AND gameId = ?2
    `).bind(householdId, gameId).all();

  getDBResult('removeGameFromHousehold', 'delete', result);
}


/******************************************************************************/


/* Given a household, and the ID information for an interrelated set of game and
 * name records, insert a record into the wishlsit table for this game.
 *
 * This does not validate that the game has a name with the ID provided; it is
 * assumed this has been pre-validated. */
export async function addGameToWishlist(ctx, householdId, gameId, nameId) {
  const result = await ctx.env.DB.prepare(`
    INSERT INTO Wishlist
      (householdId, gameId, gameName, addedByUserId)
    VALUES (?1, ?2, ?3, ?4);
    `).bind(householdId, gameId, nameId, ctx.get('userId')).all();

  getDBResult('addGameToWishlist', 'insert', result);

  // TODO: This is wasteful; it does not need to pull the ownership data if we
  //       only want wishlist data.
  return (await getGameHouseholdDetails(ctx, { id: gameId }, householdId)).wishlist;
}


/******************************************************************************/


/* Given a household, and the ID information for a game, remove that record from
 * the database.
 *
 * This does not validate that such an entry exists in the database; it only
 * purges the entry if it happens to exist. */
export async function removeGameFromWishlist(ctx, householdId, gameId) {
  const result = await ctx.env.DB.prepare(`
    DELETE FROM Wishlist
     WHERE householdId = ?1 AND gameId = ?2
    `).bind(householdId, gameId).all();

  getDBResult('removeGameFromWishlist', 'delete', result);
}


/******************************************************************************/
