/******************************************************************************/


import { Hono } from 'hono'
import { wrappedRequest as _, validate } from '#requests/common';

import { getExpansionDetailsReq } from '#requests/game/expansion/details';
import { updateExpansionDetailsReq } from '#requests/game/expansion/update';
import { updateExpansionDetailsBggReq } from '#requests/game/expansion/updateBGG';

import { BGGGameIDSchema } from '#schema/bgg';
import { GameIDSchema, ExpansionUpdateSchema } from '#schema/game';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const expansion = new Hono();

// Given a set of input records, try to establish game expansion links in the
// database. The second variation looks up the data for the game in BGG in
// order to provide the update; for games that are added without expansion info.
expansion .put('/update', validate('json', ExpansionUpdateSchema), ctx => _(ctx, updateExpansionDetailsReq));
expansion .get('/update/bgg/:bggId', validate('param', BGGGameIDSchema), ctx => _(ctx, updateExpansionDetailsBggReq));

// Given a gameId (and not a slug), look up the data that indicates the list of
// expansions and base games that associate with that game. In this parlance,
// expansions are games that expand this game if it is a base game, and base
// games are games that this game would expand, if this game was an expansion.
expansion .get('/list/:gameId', validate('param', GameIDSchema), ctx => _(ctx, getExpansionDetailsReq));


/******************************************************************************/

