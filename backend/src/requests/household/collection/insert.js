/******************************************************************************/


import { success, fail } from '#requests/common';


import { getHouseholdDetails, addGameToHousehold,
         removeGameFromWishlist } from '#db/household';
import { getGameDetails, getGameNames } from '#db/game';


/******************************************************************************/


/* Given information on a game, attempt to add that game to the collection of
 * a specific household. This requires that we also be told which publisher the
 * game is to be added with, as well as which of the many possible names it
 * should take. */
export async function householdCollectionAddReq(ctx) {
  const { idOrSlug } = ctx.req.valid('param');
  const { game, name, publisher } = ctx.req.valid('json');

  // Try to find the household we want to add the game to.
  const householdInfo = await getHouseholdDetails(ctx, idOrSlug);
  if (householdInfo === null) {
    return fail(ctx, `unable to locate household with id ${idOrSlug}`, 404);
  }

  // Look up and validate the game that was specified in the request.
  const gameInfo = await getGameDetails(ctx, game, householdInfo.id);
  if (gameInfo === null) {
    return fail(ctx, `unable to locate game with id ${game}`, 404);
  }

  // If this game is already owned, then there is nothing else that needs to be
  // done; this will short circut below validation, which is less interesting if
  // know we don't need to do anything anyway.
  if (gameInfo.owned !== undefined) {
    return fail(ctx, `game ${gameInfo.slug} is already owned by ${householdInfo.slug}`, 400);
  }

  // Verify that the publisher record that we were given exists and is
  // associated with this game; this can be done by checking the list of
  // publishers in the details.
  const publisherInfo = gameInfo.publisher.find(e => e.id === publisher || e.slug === publisher);
  if (publisherInfo === undefined) {
    return fail(ctx, `publisher ${publisher} does not exist or is not a publisher of ${gameInfo.slug}`, 404);
  }

  // Grab the list of names that are known for this game and verify that an
  // entry with the name that we were given appears here.
  const nameInfo = await getGameNames(ctx, gameInfo.id);
  const nameRecord = nameInfo.find(e => e.id === name || e.name === name)
  if (nameRecord === undefined) {
    return fail(ctx, `game ${gameInfo.slug} does not have a name with ID ${name}`, 404);
  }

  // Add the game to the collection
  const result = await addGameToHousehold(ctx, householdInfo.id, gameInfo.id, nameRecord.id, publisherInfo.id);

  // If the game uis currently in thw wishlist, then remove it
  if (gameInfo.wishlist !== undefined) {
    await removeGameFromWishlist(ctx, householdInfo.id, gameInfo.id);
  }

  return success(ctx, `added ${gameInfo.slug} to the collection for ${householdInfo.slug}`, result);
}


/******************************************************************************/
