import { Hono } from 'hono';
import { cors } from 'hono/cors'


/******************************************************************************/


const app = new Hono();
const APIV1 = '/api/v1'

/* Ensure that the application can talk to the API. */
app.use('/api/*', cors())

/* Sample endpoint.  */
app.get(`${APIV1}/test`, ctx => ctx.json({"success": true}));


/******************************************************************************/


export default app;