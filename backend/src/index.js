import { Hono } from 'hono';
import { cors } from 'hono/cors'

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

// Collect information about a BoardGameGeek board game entry.
app.get(`${APIV1}/bgg/boardgame/:bggGameId`, lookupBGGGameInfo);


/*******************************************************************************
 * Core Game Data API
 *******************************************************************************
 * Items in this section are for creating, querying, updating and deleting core
 * game information. This includes the core information about games as well as
 * the metadata that is associated with games.
 ******************************************************************************/

// Add a game using the details provided in the body of the request; the format
// looks like that which comes out of the BGG wrapper API for board games.
app.put(`${APIV1}/game/data/details/add`, insertGameReq);

// Add a game by looking up the details of a BoardGameGeek game ID and then
// using that to add the actual game.
app.put(`${APIV1}/game/data/details/bgg/add/:bggGameId{[0-9]+}`, insertBGGGameReq)
app.put(`${APIV1}/game/data/details/bgg/add/list`, insertBGGGameListReq)

// Get a list of all known games, and get the details of a specific game.
app.get(`${APIV1}/game/list`, ctx => gameListReq(ctx));
app.get(`${APIV1}/game/:idOrSlug`, ctx => gameDetailsReq(ctx));

// Perform an update on the core metadata fields that can associate with games;
// these all take a list of objects that represent metadata in the given format
// and will ensure that all of them exist in the database, adding any that are
// missing and skipping over any that already exist.
//
// They all return back the database records for all such items, so that a
// single call can update the list and also obtain the details for future use.
app.put(`${APIV1}/game/meta/designer/update`, ctx => metadataUpdateReq(ctx, 'designer'));
app.put(`${APIV1}/game/meta/artist/update`, ctx => metadataUpdateReq(ctx, 'artist'));
app.put(`${APIV1}/game/meta/publisher/update`, ctx => metadataUpdateReq(ctx, 'publisher'));
app.put(`${APIV1}/game/meta/category/update`, ctx => metadataUpdateReq(ctx, 'category'));
app.put(`${APIV1}/game/meta/mechanic/update`, ctx => metadataUpdateReq(ctx, 'mechanic'));

// Gather information about the specific metadata, which includes the name,
// slug, and (optionally) the list of games that reference that metadata.
app.get(`${APIV1}/game/meta/designer/list`, ctx => metadataListReq(ctx, 'designer'));
app.get(`${APIV1}/game/meta/artist/list`, ctx => metadataListReq(ctx, 'artist'));
app.get(`${APIV1}/game/meta/publisher/list`, ctx => metadataListReq(ctx, 'publisher'));
app.get(`${APIV1}/game/meta/category/list`, ctx => metadataListReq(ctx, 'category'));
app.get(`${APIV1}/game/meta/mechanic/list`, ctx => metadataListReq(ctx, 'mechanic'));

// Gather information about the specific metadata, which includes the name,
// slug, and (optionally) the list of games that reference that metadata.
app.get(`${APIV1}/game/meta/designer/:idOrSlug`, ctx => metadataQueryReq(ctx, 'designer'));
app.get(`${APIV1}/game/meta/artist/:idOrSlug`, ctx => metadataQueryReq(ctx, 'artist'));
app.get(`${APIV1}/game/meta/publisher/:idOrSlug`, ctx => metadataQueryReq(ctx, 'publisher'));
app.get(`${APIV1}/game/meta/category/:idOrSlug`, ctx => metadataQueryReq(ctx, 'category'));
app.get(`${APIV1}/game/meta/mechanic/:idOrSlug`, ctx => metadataQueryReq(ctx, 'mechanic'));



/******************************************************************************/


export default app;