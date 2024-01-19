/******************************************************************************/


import { Hono } from 'hono'
import { wrappedRequest as _, validate } from '#requests/common';

import { sessionAddReq } from '#requests/session/insert';
import { sessionUpdateReq } from '#requests/session/update';
import { sessionListReq } from '#requests/session/list';
import { sessionDetailsReq } from '#requests/session/details';

import { SessionIDSchema, NewSessionReportSchema, UpdateSessionReportSchema,
         SessionListParamSchema } from '#schema/session';


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

