/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { ExpansionUpdateSchema } from '#schema/game';

import { dbExpansionUpdate } from '#db/expansion';


/******************************************************************************/


/* Input: An array of items that contains information on either expansions for
 *        a particular game or something.
 *
 * This will attempt to do the stuff in the place. */
export const $put = routeHandler(
  validateZod('json', ExpansionUpdateSchema),

  async (ctx) => {
    // Get the body of data that allows us to perform the expansion update
    // Grab the records that give us information on the expansion information that
    // we want to update.
    const { gameId, bggId, expansions } = ctx.req.valid('json');

    // Execute the request and return the result back.
    const result = await dbExpansionUpdate(ctx, gameId, bggId, expansions);

    return success(ctx, `updated expansion links`, result);
  }
);


/******************************************************************************/