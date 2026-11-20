/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { PickerFilterIdSchema, PickerFilterUpdateSchema } from '#schema/insights';

import {
  dbPickerFilterDelete, dbPickerFilterUpdate, dbUserPrimaryHousehold
} from '#db/insights';


/******************************************************************************/


/* Update a saved filter. Any household member may edit; the id is scoped to the
 * user's primary household, so another household's id is a 404. */
export const $put = routeHandler(
  validateZod('param', PickerFilterIdSchema),
  validateZod('json', PickerFilterUpdateSchema),

  async (ctx) => {
    const { filterId } = ctx.req.valid('param');
    const { name, filter } = ctx.req.valid('json');
    const householdId = await dbUserPrimaryHousehold(ctx, ctx.get('userId'));

    if (householdId === null) {
      return fail(ctx, `unable to locate filter ${filterId}`, 404);
    }

    const result = await dbPickerFilterUpdate(ctx, {
      householdId,
      filterId,
      name,
      filter
    });

    if (result.notFound) {
      return fail(ctx, `unable to locate filter ${filterId}`, 404);
    }

    if (result.conflict) {
      return fail(
        ctx,
        `a filter named '${name}' already exists`,
        409,
        { existingId: result.existingId }
      );
    }

    return success(ctx, `updated filter ${filterId}`, result.filter);
  }
);


/******************************************************************************/


/* Delete a saved filter from the household. */
export const $delete = routeHandler(
  validateZod('param', PickerFilterIdSchema),

  async (ctx) => {
    const { filterId } = ctx.req.valid('param');
    const householdId = await dbUserPrimaryHousehold(ctx, ctx.get('userId'));
    const deleted = householdId === null
      ? false
      : await dbPickerFilterDelete(ctx, householdId, filterId);

    if (deleted === false) {
      return fail(ctx, `unable to locate filter ${filterId}`, 404);
    }

    return success(ctx, `deleted filter ${filterId}`, { filterId });
  }
);


/******************************************************************************/
