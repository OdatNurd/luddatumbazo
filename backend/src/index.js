import { Hono } from 'hono';
import { cors } from 'hono/cors'

import { lookupBGGGameInfo } from './db/bgg_bridge.js';


/******************************************************************************/


const app = new Hono();
const APIV1 = '/api/v1'

/* Ensure that the application can talk to the API. */
app.use('/api/*', cors())

/* Wrap the BoardGameGeek XML API and return a converted version of the matching
 * record, in JSON format. This contains only the fields we know or care about
 * for our purposes. */
app.get(`${APIV1}/bgg/boardgame/:bggGmeId`, lookupBGGGameInfo);


/******************************************************************************/


export default app;