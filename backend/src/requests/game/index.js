/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { expansion } from '#requests/game/expansion/index';
import { metadata } from '#requests/game/metadata/index';

import { BGGGameIDSchema } from '#schema/bgg';
import { GameLookupIDSchema, GameLookupParamSchema, GameLookupHouseholdSchema,
         NewGameSchema, BGGGameIDListSchema,
         GameLookupIDListSchema } from '#schema/game';

import { insertGameReq } from '#requests/game/insert';
import { insertBGGGameReq } from '#requests/game/insertBGG';
import { insertBGGGameListReq } from '#requests/game/insertBGGList';
import { performGameLookupReq } from '#requests/game/lookup';
import { gameListReq } from '#requests/game/list';
import { gameDetailsReq } from '#requests/game/details';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const game = new Hono();


game.put('/data/details/add',
         validate('json', NewGameSchema),
         ctx => _(ctx, insertGameReq));
game.put('/data/details/bgg/add/:bggId{[0-9]+}',
         validate('param', BGGGameIDSchema),
         ctx => _(ctx, insertBGGGameReq));
game.put('/data/details/bgg/add/list',
         validate('json', BGGGameIDListSchema),
         ctx => _(ctx, insertBGGGameListReq));

game.post('/lookup',
          validate('query', GameLookupParamSchema),
          validate('json', GameLookupIDListSchema),
          ctx => _(ctx, performGameLookupReq));

game.get('/list', ctx => _(ctx, gameListReq));

game.get('/:idOrSlug',
         validate('query', GameLookupHouseholdSchema),
         validate('param', GameLookupIDSchema),
         ctx => _(ctx, gameDetailsReq));

// Tie in the sub requests as well
game.route('/data/expansions', expansion);
game.route('/meta', metadata);


/******************************************************************************/

