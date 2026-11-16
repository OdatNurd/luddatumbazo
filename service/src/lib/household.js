/******************************************************************************/


import { fail } from '@odatnurd/cf-requests';

import { dbHouseholdDetails, dbHouseholdMembership } from '#db/household';


/******************************************************************************/


/* Resolve a household from a route parameter and require the current user to
 * be a member of it.
 *
 * The result is either { household } or { response }, where response is the
 * ready-to-return failure. Household existence alone is not authorization. */
export async function householdAccess(ctx, householdIdOrSlug) {
  const household = await dbHouseholdDetails(ctx, householdIdOrSlug);

  if (household === null) {
    return {
      response: fail(ctx, `unable to locate household with id ${householdIdOrSlug}`, 404)
    };
  }

  const isMember = await dbHouseholdMembership(ctx, household.id, ctx.get('userId'));
  if (isMember === false) {
    return {
      response: fail(ctx, `you are not a member of household ${householdIdOrSlug}`, 403)
    };
  }

  return { household };
}


/******************************************************************************/
