import { Hono } from 'hono';
import { cors } from 'hono/cors'

import { wrappedRequest as _ } from './requests/common.js';
import { lookupBGGGameInfo } from './requests/bgg.js';
import { insertGameReq, insertBGGGameReq, insertBGGGameListReq,
         gameListReq, gameDetailsReq } from './requests/game.js'
import { metadataUpdateReq, metadataQueryReq,
         metadataListReq } from './requests/metadata.js'


/******************************************************************************/


const app = new Hono();
const APIV1 = '/api/v1'

/* Ensure that the application can talk to the API. */
app.use('/api/*', cors())


/*******************************************************************************
 * BGG Wrapper API
 *******************************************************************************
 * Items in this section act as a proxy to BoardGameGeek and allow you to hit
 * an endpoint in Luddatumbazo that will gather the data from the BGG API and
 * convert it to JSON to make handling of it easier.
 ******************************************************************************/

// Given a BoardGameGeek game ID, access the BGG API and return back and object
// that describes that game. The object is in the same form as that used by
// inserts or queries from our internal game API's.
app.get(`${APIV1}/bgg/boardgame/:bggGameId`, ctx => _(ctx, lookupBGGGameInfo));


/*******************************************************************************
 * Core Game Data API
 *******************************************************************************
 * Items in this section are for creating, querying, updating and deleting core
 * game information. This includes the core information about games as well as
 * the metadata that is associated with games.
 ******************************************************************************/

// Given a list of metadata objects, try to insert any that are not currently in
// the database, and then return back a complete list of our internal records
// for all of the specified items.
app.put(`${APIV1}/game/meta/:metaType/update`, ctx => _(ctx, metadataUpdateReq));

// Get the complete list of records for a specific type of metadata. T
app.get(`${APIV1}/game/meta/:metaType/list`, ctx => _(ctx, metadataListReq));

// Gather information about a specific metadata type, which includes the name
// and slug. This takes an optional "game" query argument, which will cause it to
// return details on each game that associates with that metadata item.
app.get(`${APIV1}/game/meta/:metaType/:idOrSlug`, ctx => _(ctx, metadataQueryReq));

// Add a game or games to the database.
//
// The first of these takes an object that describes the game, the second looks
// up a game on BoardGameGeek and inserts the game based on that data, and the
// third takes a list of BGG game ID's and inserts them all.
app.put(`${APIV1}/game/data/details/add`, ctx => _(ctx, insertGameReq));
app.put(`${APIV1}/game/data/details/bgg/add/:bggGameId{[0-9]+}`, ctx => _(ctx, insertBGGGameReq))
app.put(`${APIV1}/game/data/details/bgg/add/list`, ctx => _(ctx, insertBGGGameListReq))

// Get a list of all games known to the system, or the details of a specific
// game that the system knows about.
app.get(`${APIV1}/game/list`, ctx => _(ctx, gameListReq));
app.get(`${APIV1}/game/:idOrSlug`, ctx => _(ctx, gameDetailsReq));


/******************************************************************************/


export default app;