/******************************************************************************/


import { getDBResult } from '#db/common';


/******************************************************************************/


/* Return a list of all of the users that belong to a specific household; this
 * may be an empty list for households that have no users currently. */
export async function getHouseholdUsers(ctx, householdId) {
  // Find all of the users that exist in this household.
  const userLookup = await ctx.env.DB.prepare(`
    SELECT A.id, A.name, A.displayName, a.emailAddress
    FROM User as A,
         UserHousehold as B
    WHERE A.id = B.userId
      AND B.householdId = ?
  `).bind(householdId).all();

  return getDBResult('getHouseholdUsers', 'find_users', userLookup);
}


/******************************************************************************/
