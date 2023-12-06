import { Hono } from 'hono';
import { cors } from 'hono/cors'

import { lookupBGGGameInfo } from './db/bgg_bridge.js';
import { insertGame, gameMetadataUpdate } from './db/data.js'


/******************************************************************************/


const app = new Hono();
const APIV1 = '/api/v1'

/* Ensure that the application can talk to the API. */
app.use('/api/*', cors())

/* Wrap the BoardGameGeek XML API and return a converted version of the matching
 * record, in JSON format. This contains only the fields we know or care about
 * for our purposes. */
app.get(`${APIV1}/bgg/boardgame/:bggGameId`, lookupBGGGameInfo);

// This one would add a core entry for a game; this takes as input something
// that looks just like the output of the BGG API above and adds an entry for
// the game.
app.put(`${APIV1}/game/data/details/add`, insertGame);

// These would bulk insert new records into each of the given metadata
// categories, given an input list. They would skip over any items with a bggID
// that already exist in the table, and return back an updated list of the
// items, providing details on which were added and which were skipped.
app.put(`${APIV1}/game/meta/category/update`, ctx => gameMetadataUpdate(ctx, 'category'));
app.put(`${APIV1}/game/meta/mechanic/update`, ctx => gameMetadataUpdate(ctx, 'mechanic'));
app.put(`${APIV1}/game/meta/designer/update`, ctx => gameMetadataUpdate(ctx, 'designer'));
app.put(`${APIV1}/game/meta/artist/update`, ctx => gameMetadataUpdate(ctx, 'artist'));
app.put(`${APIV1}/game/meta/publisher/update`, ctx => gameMetadataUpdate(ctx, 'publisher'));

// // This one would take a list of names for a game and associate them in.
// app.put(`${APIV1}/game/data/names/add/:gameId`, thing);



/******************************************************************************/


export default app;