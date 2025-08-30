/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { BGGGameIDSchema } from '#schema/bgg';
import { GameIDSchema, ExpansionUpdateSchema } from '#schema/game';

import { reqGetExpansionDetails } from '#requests/game/expansion/details';
import { reqUpdateExpansionDetails } from '#requests/game/expansion/update';
import { reqUpdateExpansionDetailsBgg } from '#requests/game/expansion/updateBGG';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const expansion = new Hono();


expansion.put('/update',
              validate('json', ExpansionUpdateSchema),
              ctx => _(ctx, reqUpdateExpansionDetails));

expansion.get('/update/bgg/:bggId',
              validate('param', BGGGameIDSchema),
              ctx => _(ctx, reqUpdateExpansionDetailsBgg));

expansion.get('/list/:gameId',
              validate('param', GameIDSchema),
              ctx => _(ctx, reqGetExpansionDetails));


/******************************************************************************/

