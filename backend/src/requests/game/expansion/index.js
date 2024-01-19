/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { BGGGameIDSchema } from '#schema/bgg';
import { GameIDSchema, ExpansionUpdateSchema } from '#schema/game';

import { getExpansionDetailsReq } from '#requests/game/expansion/details';
import { updateExpansionDetailsReq } from '#requests/game/expansion/update';
import { updateExpansionDetailsBggReq } from '#requests/game/expansion/updateBGG';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const expansion = new Hono();


expansion.put('/update',
              validate('json', ExpansionUpdateSchema),
              ctx => _(ctx, updateExpansionDetailsReq));

expansion.get('/update/bgg/:bggId',
              validate('param', BGGGameIDSchema),
              ctx => _(ctx, updateExpansionDetailsBggReq));

expansion.get('/list/:gameId',
              validate('param', GameIDSchema),
              ctx => _(ctx, getExpansionDetailsReq));


/******************************************************************************/

