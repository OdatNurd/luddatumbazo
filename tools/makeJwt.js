/******************************************************************************/


import * as jose from 'jose';
import toml from 'toml';
import fs from 'fs';


/******************************************************************************/


/* The location of the wrangler file that stores the public configuration of the
 * worker that we run during development mode. This file is loaded to get the
 * fields that we need in order to generate the token. */
const WRANGLER_FILE_PATH = "backend/wrangler.toml"


/******************************************************************************/


/* Load the wrangler configuration file and convert it into a dictionary for
 * return back. The file is assumed to be in TOML format. */
function getWranglerConfig() {
  const content = fs.readFileSync(WRANGLER_FILE_PATH, { encoding: 'utf-8'});
  return toml.parse(content);
}


/******************************************************************************/


/* Generate and return back a JWT valid starting now, using the same issuer,
 * audience and claims as a "real" Cloudflare access would have.
 *
 * The token claims will include the email address provided, and the subject of
 * the token will be the provided uuid, which should be the UUID of the user as
 * known by Cloudflare Access. */
function makeJWT(email, uuid) {
  // Get the wrangler configuration file
  const config = getWranglerConfig();

  return new jose.UnsecuredJWT(
    {
      'email': email,
      'type': 'app',
      'identity_nonce': 'NotANonce',
      'country': 'CA'
    })
    .setAudience([
      config.vars.CF_AUD_TAG
     ])
    .setIssuedAt()
    .setNotBefore('1s ago')
    .setExpirationTime('1 year')
    .setIssuer(config.vars.CF_TEAM_DOMAIN)
    .setSubject(uuid)
    .encode();
}


/******************************************************************************/


/* Entrypoint. */
function main() {
  // Get the command line arguments; we want two, one for the email of the
  // user and another for their UUID.
  //
  // If all arguments are not present, we can exit.
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.log(`Usage: ${process.argv[1].split('/').at(-1)} <email> <uuid>`);
    process.exit(1);
  }

  // Create the token, then display it to the console.
  const jwt = makeJWT(args[0], args[1]);

  console.log(jose.decodeJwt(jwt));
  console.log(`\n${jwt}`);
}


/******************************************************************************/


main();
