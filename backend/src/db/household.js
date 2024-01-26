/******************************************************************************/


import { getDBResult } from '#db/common';
import { getHouseholdUsers } from '#db/userhousehold';


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
