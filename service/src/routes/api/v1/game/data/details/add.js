/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { NewGameSchema } from '#schema/game';

import { dbGameInsert } from '#db/game';


/******************************************************************************/


/* This takes as input an object that conforms to the NewGameSchema schema and
 * inserts a new game record into the database based on the passed in data,
 * including adding name records, adding in any of the metadata fields that are
 * not already present, and updating the placement of those items so that the
 * full game record is available. */
export const $put = routeHandler(
  validateZod('json', NewGameSchema),

  async (ctx) => {
    // Suck in the new game data and use it to do the insert; the helper
    // function does all of the validation, and will throw on error or return
    // details of the new game on success OR null if the slug for the game
    // already exists, since that needs to be unique.
    const gameData = await ctx.req.valid('json');

    const newGameInfo = await dbGameInsert(ctx, gameData);
    if (newGameInfo === null) {
      return fail(ctx, `game with slug ${gameData.slug} already exists`, 409);
    }

    // Return success back.
    return success(ctx, `added game ${newGameInfo.id}`, newGameInfo);
  }
);


/******************************************************************************/