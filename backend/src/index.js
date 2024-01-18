import { Hono } from 'hono';
import { cors } from 'hono/cors'

import { wrappedRequest as _ } from './requests/common.js';
import { updateExpansionDetailsReq, updateExpansionDetailsBggReq,
         getExpansionDetailsReq } from './requests/expansion.js';
import { metadataUpdateReq, metadataQueryReq,
         metadataListReq, metadataPurgeReq } from './requests/metadata.js';

import { bgg } from './requests/bgg/index.js';
import { guest } from './requests/guest/index.js';
import { image } from './requests/image/index.js';
import { session } from './requests/session/index.js';
import { game } from './requests/game/index.js'


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

app.route(`${APIV1}/bgg`, bgg);


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

app.route(`${APIV1}/game`, game);


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
app.route(`${APIV1}/guest`, guest);

// Adding and querying session reports.
app.route(`${APIV1}/session`, session);


/*******************************************************************************
 * Temporary Requests
 *******************************************************************************
 *
 * Requests in this area are not meant for permanent production use, and are
 * here only for an interim period to help backfill data, run extra test queries
 * and so on.
 ******************************************************************************/

// As a temporary endpoint on the system, using an internal table that can
// associate one of our game ID's with a BGG ID and the URL image for such a
// game, grab and upload the image for that game to our images account.
app.route(`${APIV1}/images`, image);


/******************************************************************************/


export default app;
