/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _ } from '#requests/common';


/******************************************************************************/


/* Handle a wildcarded request for a file asset stored in an R2 bucket and
 * retreive the data back.
 *
 * This handler assumes that the path that the request is being made for matches
 * a key in the attached R2 bucket, and will respond by providing the content of
 * that object back using the mime type recorded in the database. */
async function reqGameAssetDownload(ctx) {
  console.log(`serving asset ${ctx.req.path}`);

  // Construct a cache key from the incoming URL
  const cacheKey = new Request(ctx.req.url, ctx.req);

  // If the response for this request is already in the cache, then return it
  // directly.
  let response = await caches.default.match(cacheKey);
  if (response !== undefined) {
    return response;
  }

  // Grab the object from the bucket; we can 404 if it's not found.
  // Fetch the object from the bucket.
  const r2Object = await ctx.env.BUCKET.get(ctx.req.path);
  if (r2Object === null) {
    return ctx.notFound();
  }

  // Create a headers object for use in our response.
  const headers = new Headers();

  // Populate the headers with the HTTP headers from the HTTP metadata of the
  // stored object, copy the etag over, and set a cache threshold based on the
  // configured value.
  r2Object.writeHttpMetadata(headers);
  headers.set('etag', r2Object.httpEtag);
  headers.append('Cache-Control', `s-maxage=${ctx.env.ASSET_S_MAXAGE}`);

  // Create a new response to respond with the body of the R2 object.
  response = new Response(r2Object.body, { headers });

  // Use the request for the object to update the cache, then return the
  // response back. We use waitUntil on the execution context to ensure that the
  // worker waits for the cache put operation to finish before it terminates.
  ctx.executionCtx.waitUntil(caches.default.put(cacheKey, response.clone()));
  return response;
}


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const file = new Hono();


file.get('/files/*',
        ctx => _(ctx, reqGameAssetDownload));


/******************************************************************************/
