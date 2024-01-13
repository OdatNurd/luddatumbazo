/******************************************************************************/


import { Hono } from 'hono'
import { wrappedRequest as _, validate, asNumber } from '../common.js';
import { z } from 'zod';

import { sessionAddReq, NewSessionReportSchema } from './insert.js';
import { sessionUpdateReq, UpdateSessionReportSchema } from './update.js';
import { sessionListReq, SessionListParamSchema } from './list.js';
import { sessionDetailsReq } from './details.js';


/******************************************************************************/


/* Queries that manipulate specific sessions or get their details must provide
 * a valid numeric sessionId as a part of the request. */
const SessionIDSchema = z.object({
  sessionId: z.string().optional().transform(asNumber(true))
});


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const session = new Hono();

session.put('/add', validate('json', NewSessionReportSchema), ctx => _(ctx, sessionAddReq));
session.patch('/update/:sessionId',
              validate('param', SessionIDSchema),
              validate('json', UpdateSessionReportSchema), ctx => _(ctx, sessionUpdateReq));
session.get('/list', validate('query', SessionListParamSchema), ctx => _(ctx, sessionListReq));
session.get('/:sessionId', validate('param', SessionIDSchema), ctx => _(ctx, sessionDetailsReq));


/******************************************************************************/

