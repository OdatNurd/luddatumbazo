/******************************************************************************/


import { success } from "../common.js";
import { z } from 'zod';

import { performGameLookup } from '../../db/game.js';


/******************************************************************************/


/* Operations to look up games can take as a search parameter either a numeric
 * id value of the game, or a string slug. */
export const GameLookupIDListSchema = z.array(
  z.string().or(z.number())
);


/******************************************************************************/


/* Takes as a body an array of values that are either gameId values or game slug
 * names, and returns back a list of objects that tell you the id and slug
 * values for all matched games. */
export async function performGameLookupReq(ctx) {
  const filterList = await ctx.req.valid('json');

  const result = await performGameLookup(ctx, filterList);
  return success(ctx, `looked up ${result.length} games`, result);
}


/******************************************************************************/
