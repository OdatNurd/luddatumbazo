import { Hono } from 'hono';
import { cors } from 'hono/cors'

import { user } from '#requests/user/index';
import { household } from '#requests/household/index';
import { bgg } from '#requests/bgg/index';
import { guest } from '#requests/guest/index';
import { image } from '#requests/image/index';
import { session } from '#requests/session/index';
import { game } from '#requests/game/index';

import { authorization } from '#lib/middleware';


/******************************************************************************/


/* The Hono application that we use for routing; by exporting this directly, it
 * will hook into the appropriate Cloudflare Worker infrastructure to allow us
 * to handle requests. */
const app = new Hono();

/* The current API version; this prefixes all of our routes. */
const APIV1 = '/api/v1'

/* Ensure that the application can talk to the API. */
app.use('/api/*', cors())

/* Ensure that all requests get authenticated based on the user in the token
 * that is given to us by Cloudflare Access. */
app.use('/api/*', authorization);


/*******************************************************************************
 * User API
 *******************************************************************************
 * The items in this section are related to searching the list of users for
 * specific users, getting lists, and making modifications to existing users.
 *
 * There is no endpoint here for inserting a user; that happens implictly as a
 * part of auth requests.
 ******************************************************************************/

app.route(`${APIV1}/user`, user);
app.route(`${APIV1}/household`, household);


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
 * the metadata and expansion games that are associated with games.
 ******************************************************************************/

app.route(`${APIV1}/game`, game);


/*******************************************************************************
 * Core Session Reporting Data API
 *******************************************************************************
 * Items in this section are for creating, querying, updating and deleting the
 * data that's used to create and maintain the session reports in the system,
 * which includes not just the session report data but also the API's that are
 * used to manipulate the list of people that play games.
 *
 * Some requests rely on core game data from the above API's being already
 * available; these only query such data, never update it.
 ******************************************************************************/

app.route(`${APIV1}/guest`, guest);
app.route(`${APIV1}/session`, session);


/*******************************************************************************
 * Image Requests
 *******************************************************************************
 * Items in this section are related to looking up information on images within
 * the system and uploading them.
 *
 * Some of the requests in this section are currently for development use only
 * and will be redacted once the full API is complete.
 ******************************************************************************/

app.route(`${APIV1}/images`, image);


/******************************************************************************/


export default app;
