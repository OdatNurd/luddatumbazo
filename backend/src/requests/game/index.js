/******************************************************************************/


import { Hono } from 'hono'
import { wrappedRequest as _, validate, asNumber, numberOrString } from '#requests/common';
import { z } from 'zod';

import { insertGameReq, NewGameSchema } from '#requests/game/insert';
import { insertBGGGameReq } from '#requests/game/insertBGG';
import { insertBGGGameListReq, BGGGameIDListSchema } from '#requests/game/insertBGGList';
import { performGameLookupReq, GameLookupIDListSchema } from '#requests/game/lookup';
import { gameListReq } from '#requests/game/list';
import { gameDetailsReq } from '#requests/game/details';

import { getExpansionDetailsReq } from '#requests/game/expansion/details';
import { updateExpansionDetailsReq } from '#requests/game/expansion/update';
import { updateExpansionDetailsBggReq } from '#requests/game/expansion/updateBGG';

import { metadataUpdateReq } from '#requests/game/metadata/update';
import { metadataListReq } from '#requests/game/metadata/list';
import { metadataPurgeReq } from '#requests/game/metadata/purge';
import { metadataQueryReq } from '#requests/game/metadata/query';

import { BGGGameIDSchema } from '#requests/bgg/index';

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

// Given a set of input records, try to establish game expansion links in the
// database. The second variation looks up the data for the game in BGG in
// order to provide the update; for games that are added without expansion info.
game.put('/data/expansions/update', ctx => _(ctx, updateExpansionDetailsReq));
game.get('/data/expansions/update/bgg/:bggGameId{[0-9]+}', ctx => _(ctx, updateExpansionDetailsBggReq));

// Given a gameId (and not a slug), look up the data that indicates the list of
// expansions and base games that associate with that game. In this parlance,
// expansions are games that expand this game if it is a base game, and base
// games are games that this game would expand, if this game was an expansion.
game.get('/data/expansions/list/:gameId', ctx => _(ctx, getExpansionDetailsReq));

// Given a list of metadata objects, try to insert any that are not currently in
// the database, and then return back a complete list of our internal records
// for all of the specified items.
game.put('/meta/:metaType/update', ctx => _(ctx, metadataUpdateReq));

// Get the complete list of records for a specific type of metadata. T
game.get('/meta/:metaType/list', ctx => _(ctx, metadataListReq));

// Find all of the metadata entries of the given type that have no references to
// them by any game currently in the database and purge them away to clean up
// the lists.
game.delete('/meta/:metaType/purge', ctx => _(ctx, metadataPurgeReq));

// Gather information about a specific metadata type, which includes the name
// and slug. This takes an optional "game" query argument, which will cause it
// to return details on each game that associates with that metadata item.
game.get('/meta/:metaType/:slug', ctx => _(ctx, metadataQueryReq));


/******************************************************************************/

