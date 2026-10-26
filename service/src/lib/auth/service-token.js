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
 * provision them
 *
 * The token comparison is constant time (both sides are hashed first, then the
 * digests are compared without early exit) so that the time a request takes
 * does not leak how much of the presented token matched. */
export async function serviceIdentity(ctx) {
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
  if (scheme !== 'Bearer' || token === undefined) {
    return null;
  }

  if (await constantTimeEqual(token, ctx.env.SERVICE_TOKEN) === false) {
    return null;
  }

  console.log(`service token accepted; acting as user ${ctx.env.SERVICE_USER}`);
  return { sub: ctx.env.SERVICE_USER };
}


/******************************************************************************/


/* Compare two strings without leaking, through timing, how much of them
 * matched.
 *
 * Both values are hashed first so that the comparison is always between two
 * fixed length digests (an attacker cannot probe byte counts either), and the
 * digest comparison accumulates every XOR difference before deciding, so no
 * branch is taken early on the first mismatched byte. */
async function constantTimeEqual(presented, expected) {
  const encoder = new TextEncoder();

  const [presentedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(presented)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected))
  ]);

  const a = new Uint8Array(presentedDigest);
  const b = new Uint8Array(expectedDigest);

  let difference = 0;
  for (let i = 0; i < a.length; ++i) {
    difference |= a[i] ^ b[i];
  }

  return difference === 0;
}


/******************************************************************************/
