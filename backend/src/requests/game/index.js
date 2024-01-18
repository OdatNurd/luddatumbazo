/******************************************************************************/


import { Hono } from 'hono'
import { wrappedRequest as _, validate, asNumber, numberOrString } from '../common.js';
import { z } from 'zod';

import { insertGameReq, NewGameSchema } from './insert.js';
import { insertBGGGameReq } from './insertBGG.js';
import { insertBGGGameListReq, BGGGameIDListSchema } from './insertBGGList.js';
import { performGameLookupReq, GameLookupIDListSchema } from './lookup.js';
import { gameListReq } from './list.js';
import { gameDetailsReq } from './details.js';

import { BGGGameIDSchema } from '../bgg/index.js';

/******************************************************************************/


/* Operations to look up games can take as a search parameter either a numeric
 * id value of the game, or a string slug. */
export const GameLookupIDSchema = z.object({
  idOrSlug: z.string().transform(numberOrString)
});


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const game = new Hono();

// Add a game or games to the database.
//
// The first of these takes an object that describes the game, the second looks
// up a game on BoardGameGeek and inserts the game based on that data, and the
// third takes a list of BGG game ID's and inserts them all.
game.put('/data/details/add', validate('json', NewGameSchema), ctx => _(ctx, insertGameReq));
game.put('/data/details/bgg/add/:bggId{[0-9]+}', validate('param', BGGGameIDSchema), ctx => _(ctx, insertBGGGameReq));
game.put('/data/details/bgg/add/list', validate('json', BGGGameIDListSchema), ctx => _(ctx, insertBGGGameListReq));

// Given an array of values that are a mix of id values and/or slugs, perform a
// short lookup to tell you the id and slug of all matches.
game.post('/lookup', validate('json', GameLookupIDListSchema), ctx => _(ctx, performGameLookupReq));

// Get a list of all games known to the system, or the details of a specific
// game that the system knows about.
game.get('/list', ctx => _(ctx, gameListReq));
game.get('/:idOrSlug', validate('param', GameLookupIDSchema), ctx => _(ctx, gameDetailsReq));


/******************************************************************************/

