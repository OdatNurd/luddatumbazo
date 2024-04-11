/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { expansion } from '#requests/game/expansion/index';
import { metadata } from '#requests/game/metadata/index';

import { BGGGameIDSchema } from '#schema/bgg';
import { GameLookupIDSchema, GameLookupParamSchema, GameLookupHouseholdSchema,
         NewGameSchema, BGGGameIDListSchema,
         GameLookupIDListSchema } from '#schema/game';

import { reqInsertGame } from '#requests/game/insert';
import { reqInsertBGGGame } from '#requests/game/insertBGG';
import { reqInsertBGGGameList } from '#requests/game/insertBGGList';
import { reqPerformGameLookup } from '#requests/game/lookup';
import { reqGameList } from '#requests/game/list';
import { reqGameDetails } from '#requests/game/details';
import { reqGameNames } from '#requests/game/names';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const game = new Hono();


game.put('/data/details/add',
         validate('json', NewGameSchema),
         ctx => _(ctx, reqInsertGame));
game.put('/data/details/bgg/add/:bggId{[0-9]+}',
         validate('param', BGGGameIDSchema),
         ctx => _(ctx, reqInsertBGGGame));
game.put('/data/details/bgg/add/list',
         validate('json', BGGGameIDListSchema),
         ctx => _(ctx, reqInsertBGGGameList));

game.post('/lookup',
          validate('query', GameLookupParamSchema),
          validate('json', GameLookupIDListSchema),
          ctx => _(ctx, reqPerformGameLookup));

game.get('/list', ctx => _(ctx, reqGameList));

game.get('/:idOrSlug',
         validate('query', GameLookupHouseholdSchema),
         validate('param', GameLookupIDSchema),
         ctx => _(ctx, reqGameDetails));

game.get('/names/:idOrSlug',
         validate('param', GameLookupIDSchema),
         ctx => _(ctx, reqGameNames));

// Tie in the sub requests as well
game.route('/data/expansions', expansion);
game.route('/meta', metadata);


/******************************************************************************/

