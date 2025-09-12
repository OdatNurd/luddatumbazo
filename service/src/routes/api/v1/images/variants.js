/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';

import { cfImagesGetVariants } from '#db/image';


/******************************************************************************/


/* Fetch a list of all of the available imageType values, and the dimensions of
 * the images that associate with them.
 *
 * The names returned here can be used in other queries where an imageType is
 * asked for to obtain the URL to the image of that type. */
export const $get = routeHandler(
  async (ctx) => {
    const result = await cfImagesGetVariants(ctx);

    return success(ctx, `retrieved information on ${result.length} image types`, result);
  }
);


/******************************************************************************/