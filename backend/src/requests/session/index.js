/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, validate } from '#requests/common';

import { SessionIDSchema, NewSessionReportSchema, UpdateSessionReportSchema,
         SessionListParamSchema } from '#schema/session';

import { reqSessionAdd } from '#requests/session/insert';
import { reqSessionUpdate } from '#requests/session/update';
import { reqSessionList } from '#requests/session/list';
import { reqSessionDetails } from '#requests/session/details';


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const session = new Hono();


session.put('/add',
            validate('json', NewSessionReportSchema),
            ctx => _(ctx, reqSessionAdd));

session.patch('/update/:sessionId',
              validate('param', SessionIDSchema),
              validate('json', UpdateSessionReportSchema),
              ctx => _(ctx, reqSessionUpdate));

session.get('/list',
            validate('query', SessionListParamSchema),
            ctx => _(ctx, reqSessionList));

session.get('/:sessionId',
            validate('param', SessionIDSchema),
            ctx => _(ctx, reqSessionDetails));


/******************************************************************************/

