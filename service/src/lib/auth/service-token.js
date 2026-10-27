/******************************************************************************/


/* The service token path.
 *
 * This is the replacement for the old Cloudflare Access service token
 * workaround; it exists so that command line and test tooling can reach the API
 * without a browser login, which is useful because the application development
 * is frequently streamed and copying tokens around is a pain in the balls.
 *
 * A caller that presents the configured service token in an Authorization
 * bearer header is treated as being the configured service user; that user must
 * already exist in the database since we don't have the information to
 * provision them. */
export function serviceIdentity(ctx) {
  // Without both of the values configured there is nothing to compare against
  // and no user to become.
  if (ctx.env.SERVICE_TOKEN === undefined || ctx.env.SERVICE_USER === undefined) {
    return null;
  }

  // The credential must arrive as a bearer token.
  const header = ctx.req.header('Authorization');
  if (header === undefined) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || token !== ctx.env.SERVICE_TOKEN) {
    return null;
  }

  console.log(`service token accepted; acting as user ${ctx.env.SERVICE_USER}`);
  return { sub: ctx.env.SERVICE_USER };
}


/******************************************************************************/
