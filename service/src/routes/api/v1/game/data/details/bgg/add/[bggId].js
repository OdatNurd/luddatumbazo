/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { BGGGameIDSchema } from '#schema/bgg';

import { dbGameInsertByBGG } from '#db/game';


/******************************************************************************/


/* Input: a bggGameId in the URL that represents the ID of a game from
 * BoardGameGeek that we want to insert.
 *
 * This will look up the data for the game and use it to perform the insertion
 * directly.
 *
 * The result of this query is the same as adding a game by providing an
 * explicit body. */
export const $put = routeHandler(
  validateZod('param', BGGGameIDSchema),

  async (ctx) => {
    const { bggId } = ctx.req.valid('param');

    const newGameInfo = await dbGameInsertByBGG(ctx, bggId);
    if (newGameInfo === null) {
      return fail(ctx, `BGG has no record of game with ID ${bggId}`, 404);
    }

    // Return success back.
    return success(ctx, `added game ${newGameInfo.id}`, newGameInfo);
  }
);


/******************************************************************************/