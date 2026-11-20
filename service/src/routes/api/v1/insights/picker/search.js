/******************************************************************************/


import { routeHandler, success } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { PickerSearchSchema } from '#schema/insights';

import { dbPickerSearch, dbUserPrimaryHousehold } from '#db/insights';


/******************************************************************************/


/* Draw a random owned base game that satisfies the picker filter. The draw is
 * uniform over the match pool and happens on the server, so the client cannot
 * bias it; excludeGameId only removes the current pick from the next draw. */
export const $post = routeHandler(
  validateZod('json', PickerSearchSchema),

  async (ctx) => {
    const { filter, excludeGameId } = ctx.req.valid('json');
    const householdId = await dbUserPrimaryHousehold(ctx, ctx.get('userId'));

    const result = await dbPickerSearch(ctx, {
      householdId,
      filter,
      excludeGameId
    });

    return success(ctx, `found ${result.total} matching games`, result);
  }
);


/******************************************************************************/
