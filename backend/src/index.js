import { Hono } from 'hono';
import { cors } from 'hono/cors'

import { wrappedRequest as _ } from '#requests/common';

import { bgg } from '#requests/bgg/index';
import { guest } from '#requests/guest/index';
import { image } from '#requests/image/index';
import { session } from '#requests/session/index';
import { game } from '#requests/game/index';


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
