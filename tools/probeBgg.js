/******************************************************************************/


import { config } from 'dotenv';

config({ path: ['.dev.vars'] });


/******************************************************************************/


/* Probe the BoardGameGeek XML API with the application token from .dev.vars.
 *
 * This is a local diagnostic only. It deliberately sends the exact request that
 * service/src/lib/bgg.js sends (same URL, same bearer header), so a failure
 * here means the token or BGG itself is the problem, not the worker, the
 * session or the dialog.
 *
 * Usage:
 *     node ./tools/probeBgg.js            # Ark Nova (342942)
 *     node ./tools/probeBgg.js 1472       # any BGG id
 *
 * The token itself is never printed; only its shape is.
 *
 * Notes on what you might see:
 *   200  - the token works and the game data came back.
 *   202  - BGG accepted the request but has not built the response yet; wait a
 *          few seconds and run it again.
 *   401  - the token is missing, wrong, revoked, or belongs to another app.
 *   403  - the application behind the token is not approved.
 */


/******************************************************************************/


const BGG_API_URL = 'https://boardgamegeek.com/xmlapi';
const BGG_API2_URL = 'https://boardgamegeek.com/xmlapi2';

/* The value that .dev.vars ships with until a real token is pasted in. */
const PLACEHOLDER = 'paste-your-bgg-token-here';


/******************************************************************************/


/* Describe the token without revealing it; a JWT style token and an opaque
 * string fail in different ways, so the shape is worth knowing. */
const tokenShape = token => {
  const kind = token.startsWith('eyJ') ? 'looks like a JWT' : 'opaque string';
  return `(${token.length} chars, ${kind})`;
};


/* Return the first capture group of the first match, or null. */
const firstMatch = (text, pattern) => text.match(pattern)?.[1]?.trim() ?? null;


/* Count how many elements of the given name appear in the document. */
const countOf = (text, name) => (text.match(new RegExp(`<${name}\\b`, 'g')) ?? []).length;


/* Make a request to one of the BGG API roots and collect the response. */
async function request(base, path, token) {
  const url = `${base}/${path}`;
  const started = Date.now();

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.text();

  return {
    url,
    status: res.status,
    statusText: res.statusText,
    contentType: res.headers.get('content-type'),
    ms: Date.now() - started,
    body
  };
}


/* Print a compact description of one response; for a good response, also pull
 * out enough facts to show that this is really the game we asked for. */
function report(label, result) {
  const type = result.contentType ?? 'no content type';
  console.log(`\n${label}: ${result.status} ${result.statusText} (${result.ms} ms, ${type}, ${result.body.length} bytes)`);
  console.log(`  url: ${result.url}`);

  // A queued response is not a failure of the token at all; BGG is building it.
  if (result.status === 202) {
    console.log('  BGG queued the request; wait a few seconds and run this again.');
    console.log(`  body starts: ${result.body.slice(0, 160).replace(/\s+/g, ' ')}`);
    return;
  }

  if (result.status !== 200) {
    console.log(`  body starts: ${result.body.slice(0, 300).replace(/\s+/g, ' ')}`);
    return;
  }

  // The primary name carries the primary="true" attribute; fall back to the
  // first name in the document if it is missing for some reason.
  const primary = firstMatch(result.body, /<name\b[^>]*primary="true"[^>]*>([^<]+)<\/name>/)
    ?? firstMatch(result.body, /<name\b[^>]*>([^<]+)<\/name>/);

  const names = [...result.body.matchAll(/<name\b[^>]*>([^<]+)<\/name>/g)]
    .map(match => match[1].trim())
    .slice(0, 4);

  const year = firstMatch(result.body, /<yearpublished[^>]*>([^<]+)</);
  const minPlayers = firstMatch(result.body, /<minplayers[^>]*>([^<]+)</);
  const maxPlayers = firstMatch(result.body, /<maxplayers[^>]*>([^<]+)</);

  console.log(`  primary name: ${primary ?? '(not found)'}`);
  console.log(`  names: ${names.join(' / ') || '(none)'}`);
  console.log(`  year: ${year ?? '(none)'}, players: ${minPlayers ?? '?'}-${maxPlayers ?? '?'}`);
  console.log(`  categories: ${countOf(result.body, 'boardgamecategory')},`
    + ` mechanics: ${countOf(result.body, 'boardgamemechanic')},`
    + ` designers: ${countOf(result.body, 'boardgamedesigner')},`
    + ` publishers: ${countOf(result.body, 'boardgamepublisher')}`);
}


/******************************************************************************/


/* Entrypoint. */
async function main() {
  const token = process.env.BGG_API_TOKEN;

  if (token === undefined || token === '' || token === PLACEHOLDER) {
    console.log('BGG_API_TOKEN is not set in .dev.vars');
    console.log(`replace the "${PLACEHOLDER}" placeholder with the real token, then run this again.`);
    process.exit(1);
  }

  const bggId = process.argv[2] ?? '342942';

  console.log(`token: ${tokenShape(token)}`);
  console.log(`game id: ${bggId}`);

  // This is the request the service makes, so its result is the one that counts.
  const primary = await request(BGG_API_URL, `boardgame/${bggId}?stats=1`, token);
  report('xmlapi (what the service uses)', primary);

  // When the service's endpoint fails, ask the newer API the same question; the
  // difference between the two answers says whether the token is bad or whether
  // BGG has changed the response format out from under the old endpoint.
  if (primary.status !== 200) {
    const alternate = await request(BGG_API2_URL, `thing?id=${bggId}&stats=1`, token);
    report('xmlapi2 (fallback check)', alternate);
  }

  console.log('');
  process.exit(primary.status === 200 ? 0 : 1);
}


/******************************************************************************/


main();
