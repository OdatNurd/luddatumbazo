/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { PickerFilterSaveSchema } from '#schema/insights';

import {
  dbPickerFilterCreate, dbPickerFiltersList, dbUserPrimaryHousehold
} from '#db/insights';


/******************************************************************************/


/* A user with no household has no shared shelf and therefore no saved filters;
 * the list is empty rather than an error so the picker still works. */
export const $get = routeHandler(
  async (ctx) => {
    const householdId = await dbUserPrimaryHousehold(ctx, ctx.get('userId'));
    const result = householdId === null
      ? []
      : await dbPickerFiltersList(ctx, householdId);

    return success(ctx, `found ${result.length} saved filters`, result);
  }
);


/******************************************************************************/


/* Save a filter for every member of the household. A duplicate name is a 409
 * so the UI can offer Replace; the existing id is included in the payload. */
export const $post = routeHandler(
  validateZod('json', PickerFilterSaveSchema),

  async (ctx) => {
    const { name, filter } = ctx.req.valid('json');
    const userId = ctx.get('userId');
    const householdId = await dbUserPrimaryHousehold(ctx, userId);

    if (householdId === null) {
      return fail(ctx, 'a household is required to save picker filters', 400);
    }

    const result = await dbPickerFilterCreate(ctx, {
      householdId,
      userId,
      name,
      filter
    });

    if (result.conflict) {
      return fail(
        ctx,
        `a filter named '${name}' already exists`,
        409,
        { existingId: result.existingId }
      );
    }

    return success(ctx, `saved picker filter '${name}'`, result.filter, 201);
  }
);


/******************************************************************************/
