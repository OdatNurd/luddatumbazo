import { Hono } from 'hono';
import { cors } from 'hono/cors'

import { wrappedRequest as _ } from './requests/common.js';
import { lookupBGGGameInfo } from './requests/bgg.js';
import { insertGameReq, insertBGGGameReq, insertBGGGameListReq,
         gameListReq, gameDetailsReq } from './requests/game.js';
import { updateExpansionDetailsReq, updateExpansionDetailsBggReq,
         getExpansionDetailsReq } from './requests/expansion.js';
import { metadataUpdateReq, metadataQueryReq,
         metadataListReq, metadataPurgeReq } from './requests/metadata.js';
import { guestListReq, updateGuestsReq, purgeGuestsReq } from './requests/guest.js';
import { sessionAddReq, sessionListReq, sessionDetailsReq } from './requests/session.js';
import { tempImageDetailsReq } from './requests/image.js';


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

// Find all of the metadata entries of the given type that have no references to
// them by any game currently in the database and purge them away to clean up
// the lists.
app.delete(`${APIV1}/game/meta/:metaType/purge`, ctx => _(ctx, metadataPurgeReq));

// Gather information about a specific metadata type, which includes the name
// and slug. This takes an optional "game" query argument, which will cause it
// to return details on each game that associates with that metadata item.
app.get(`${APIV1}/game/meta/:metaType/:slug`, ctx => _(ctx, metadataQueryReq));

// Add a game or games to the database.
//
// The first of these takes an object that describes the game, the second looks
// up a game on BoardGameGeek and inserts the game based on that data, and the
// third takes a list of BGG game ID's and inserts them all.
app.put(`${APIV1}/game/data/details/add`, ctx => _(ctx, insertGameReq));
app.put(`${APIV1}/game/data/details/bgg/add/:bggGameId{[0-9]+}`, ctx => _(ctx, insertBGGGameReq));
app.put(`${APIV1}/game/data/details/bgg/add/list`, ctx => _(ctx, insertBGGGameListReq));

// Get a list of all games known to the system, or the details of a specific
// game that the system knows about.
app.get(`${APIV1}/game/list`, ctx => _(ctx, gameListReq));
app.get(`${APIV1}/game/:idOrSlug`, ctx => _(ctx, gameDetailsReq));

// Given a set of input records, try to establish game expansion links in the
// database. The second variation looks up the data for the game in BGG in
// order to provide the update; for games that are added without expansion info.
app.put(`${APIV1}/game/data/expansions/update`, ctx => _(ctx, updateExpansionDetailsReq));
app.get(`${APIV1}/game/data/expansions/update/bgg/:bggGameId{[0-9]+}`, ctx => _(ctx, updateExpansionDetailsBggReq));

// Given a gameId (and not a slug), look up the data that indicates the list of
// expansions and base games that associate with that game. In this parlance,
// expansions are games that expand this game if it is a base game, and base
// games are games that this game would expand, if this game was an expansion.
app.get(`${APIV1}/game/data/expansions/list/:gameId`, ctx => _(ctx, getExpansionDetailsReq));

// As a temporary endpoint on the system, using an internal table that can
// associate one of our game ID's with a BGG ID and the URL image for such a
// game, grab and upload the image for that game to our images account.
app.get(`${APIV1}/images/:bggId?`, ctx => _(ctx, tempImageDetailsReq));


/*******************************************************************************
 * Core Session Reporting Data API
 *******************************************************************************
 * Items in this section are for creating, querying, updating and deleting the
 * data that's used to create and maintain the session reports in the system.
 *
 * Some requests rely on core game data from the above API's being already
 * available; these only query such data, never update it.
 ******************************************************************************/

// Get and manipulate the guest list.
app.put(`${APIV1}/guest/add`, ctx => _(ctx, updateGuestsReq));
app.get(`${APIV1}/guest/list`, ctx => _(ctx, guestListReq));
app.delete(`${APIV1}/guest/purge`, ctx => _(ctx, purgeGuestsReq));

// Adding and querying session reports.
app.put(`${APIV1}/session/add`, ctx => _(ctx, sessionAddReq));
app.get(`${APIV1}/session/list`, ctx => _(ctx, sessionListReq));
app.get(`${APIV1}/session/:sessionId{[0-9]+}`, ctx => _(ctx, sessionDetailsReq));


/******************************************************************************/


export default app;
