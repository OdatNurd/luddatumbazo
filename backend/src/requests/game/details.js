/******************************************************************************/


import { success, fail } from '#requests/common';

import { dbGameDetails } from '#db/game';
import { dbHouseholdDetails } from '#db/household';


/******************************************************************************/


/* Return back the details on the game with the given id value or slug text;
 * this will generate an error if the game does not exist. */
export async function gameDetailsReq(ctx) {
  // Can be either an game ID or a slug to represent a game; the query string
  // can contain an optional household name or slug.
  const { idOrSlug } = ctx.req.valid('param');
  const { household: householdSlug } = ctx.req.valid('query');

  // If there is a household provided, then we need to look up the information
  // on that household to continue.
  let household = {}
  if (householdSlug !== undefined) {
    household = await dbHouseholdDetails(ctx, householdSlug);
    if (household === null) {
      return fail(ctx, `unable to locate household with id ${householdSlug}`, 404);
    }
  }

  // Look up the game; if we don't find anything by that value, then this does
  // not exist.
  const result = await dbGameDetails(ctx, idOrSlug, household.id);
  if (result === null) {
    return fail(ctx, `no such game ${idOrSlug}`, 404)
  }

  return success(ctx, `information on game ${idOrSlug}`, result);
}


/******************************************************************************/
