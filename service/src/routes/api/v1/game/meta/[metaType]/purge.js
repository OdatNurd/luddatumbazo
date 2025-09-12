/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { MetadataTypeSelectSchema } from '#schema/game';

import { dbMetadataPurge } from '#db/metadata';


/******************************************************************************/


/* Find all of the metadata items of the given type that do not have any
 * references to it and purge them away from the database. */
async function handler(ctx) {
  const { metaType } = ctx.req.valid('param');
  const purgeRecords = (ctx.req.method === "DELETE");

  // Try to execute the request; this will either return the data, or purge it,
  // depending on the arguments we got.
  const result = await dbMetadataPurge(ctx, metaType, purgeRecords);

  const msg = (purgeRecords === true)
               ? `purged all unused ${metaType} records`
               : `found ${result.length} unused ${metaType} records`;

  return success(ctx, msg, result);
}

/******************************************************************************/


/* Both routes use the same handler; it selects based on the verb used which of
 * the two actions to take. */
export const $get = routeHandler(
  validateZod('param', MetadataTypeSelectSchema),
  handler
);


export const $delete = routeHandler(
  validateZod('param', MetadataTypeSelectSchema),
  handler
);


/******************************************************************************/
