/******************************************************************************/


import sanicXML from '@axel669/sanic-xml';
import { decodeHTML } from 'entities';
import slug from "slug";

import { BGGLookupError } from '#db/exceptions';


/******************************************************************************/


// The root API that we use to talk to BoardGameGeek in order to gather data.
const BGG_API_URL = 'https://boardgamegeek.com/xmlapi';


/******************************************************************************/


/* Normalize a value from a parsed sanic-xml object into a list; in the parsed
 * form, tags that appear once are a bare value while tags that appear multiple
 * times are an array. This always returns an array, which may be empty. */
const asArray = value => (value === undefined) ? [] : (Array.isArray(value) ? value : [value]);


/* Given a value from a parsed sanic-xml object, determine whether it is an
 * element node (an object holding attributes/text) as opposed to a plain
 * text-only value (which is just a string). */
const isElement = value => (typeof value === 'object' && value !== null);


/* Given a value from a parsed sanic-xml object, return its textual content;
 * text-only nodes are strings directly, while nodes that have attributes or
 * children carry their text under the __text key.
 *
 * The result is trimmed to match how the data was handled previously. */
const nodeText = value => ((typeof value === 'string') ? value : (value?.__text ?? '')).trim();


/* Given a parsed sanic-xml object, return back the first tag found whose name
 * is the one that is passed in.
 *
 * If there is no such node found, this will return undefined. */
const getChildNamed = (input, name) => asArray(input?.[name])[0];


/* Given a parsed sanic-xml object, return back a list of all of the tags found
 * which have that name.
 *
 * The return value is always an array, although it may be empty. */
const getChildrenNamed = (input, name) => asArray(input?.[name]);


/* Given a parsed sanic-xml object, find the first node whose tag is the one
 * named and, if found, return it's textual content (if any).
 *
 * This will return undefined if the tag is not found, or if the tag has no
 * text. */
const getTextOf = (input, name) => {
  const node = getChildNamed(input, name);
  if (node === undefined) {
    return undefined;
  }

  const text = nodeText(node);
  return (text === '') ? undefined : text;
}


/* This works like getTextOf() except that the return value is coerced into an
 * integer before returning, if there is any text; otherwise, the result is
 * undefined. */
const getIntOf = (input, name) => {
  const text = getTextOf(input, name);
  return (text === undefined) ? undefined : parseInt(text);
};


/* This works like getTextOf() except that the return value is coerced into a
 * float before returning, if there is any text; otherwise, the result is
 * undefined. */
const getFloatOf = (input, name) => {
  const text = getTextOf(input, name);
  return (text === undefined) ? undefined : parseFloat(text);
};


/* Given a particular array of input nodes, find all nodes with the given name
 * and return back their BoardGameGeek associated data.
 *
 * All such nodes should contain a child node containing text and an objectid
 * attribute that uniquely identifies them.
 *
 * The result of this is a list of objects (which may be empty) that contains
 * the BGG ID value and text.
 *
 * Any nodes of this name that don't follow this data pattern are skipped. */
const getAllItemsOf = (input, name) => getChildrenNamed(input, name)
  .filter(el => isElement(el) && nodeText(el) !== '' && el._objectid !== undefined)
  .map(el => {
    const name = decodeHTML(nodeText(el));
    return {
      name,
      "bggId": parseInt(el._objectid),
      "slug": slug(name)
    }
  });


/* Given a specific input list of nodes, find all of the nodes that contain
 * an entry that specifies that they are the name of the game, and return back
 * a list of them in a sorted order.
 *
 * One of the name nodes will have an attribute that indicates that it is the
 * "primary" name for the game; this name is always sorted to be the first one
 * in the list of names. */
const getGameNames = input => getChildrenNamed(input, 'name').sort((left, right) => {
  // Sort the node that has the "primary" attribute to be first
  if (isElement(left) && left._primary) return -1;
  if (isElement(right) && right._primary) return 1;

  // Fall back to sorting based on the child text.
  const lText = (nodeText(left) !== '') ? nodeText(left) : undefined;
  const rText = (nodeText(right) !== '') ? nodeText(right) : undefined;

  // Return the appropriate locale comparison value; Sort a missing item to
  // come after those which exist; when both exist, return the comparison.
  if (lText === undefined) {
    return 1;
  } else if (rText == undefined) {
    return -1;
  } else {
    return lText.localeCompare(rText, 'en', {sensitivity: 'base'});
  }
}).map(el => decodeHTML(nodeText(el)));


/* Given an input tag, find all of the boardgameexpansion records and return
 * back a mapped version of the list (which may be empty) that indicates the
 * name and bggId of the entry, with a boolean that indicates whether or not
 * that entry is an expansion to another game or represents a base game.
 *
 * That is to say, a base game has records that associate it with its expansions
 * and an expansion has records of what games it expands. */
const getGameExpansions = input => getChildrenNamed(input, 'boardgameexpansion')
   .map(expansion => {
      const bggId = parseInt(isElement(expansion) ? expansion._objectid : undefined);
      const name = (nodeText(expansion) !== '') ? decodeHTML(nodeText(expansion)) : 'unknown';
      const isExpansion = (isElement(expansion) ? expansion._inbound : undefined) === undefined;

      return { isExpansion, name, bggId }
   });


/******************************************************************************/


/* Given a sanic-xml JSON representation of a BoardGameGeek BoardGame API
 * response for a specific board game entry, convert it into a normalized JSON
 * form and return the value back. */
function makeBggGameData(gameEntry, gameId) {
  // Start preparing our output structure by including the BoardGameGeek ID for
  // this game in it.
  const output = { "bggId": gameId };

  // The statistics node will us the average game weight, presuming that the
  // incoming request asked for it. If so, pull it out.
  const statistics = getChildNamed(gameEntry, 'statistics');
  const ratings = (statistics === undefined) ? undefined : getChildNamed(statistics, 'ratings');

  // Grab all of the name nodes, and sort them by text, bringing the primary
  // item to the top of the list. We will also generate an interim slug based on
  // the official name of the game.
  output.name = getGameNames(gameEntry);
  if (output.name.length > 0) {
    output.slug = slug(output.name[0]);
    output.primaryName = output.name[0];
  }

  // There are a set of records that tell us what games we expand (if any) and
  // what games expand us (if any). The result of this is a list (which may be
  // empty) of records that convey this information along with an identifying
  // name value.
  output.expansions = getGameExpansions(gameEntry);

  // Pull in the basic information about the game
  output.description = decodeHTML(getTextOf(gameEntry, 'description'));
  output.thumbnail = getTextOf(gameEntry, 'thumbnail');
  output.image = getTextOf(gameEntry, 'image');

  // This data is not in the BGG database, but we strictly require it in order
  // to perform inserts later.
  output.officialUrl = '';
  output.teachingUrl = '';

  // Get the core game details.
  output.published = getIntOf(gameEntry, 'yearpublished');
  output.minPlayers = getIntOf(gameEntry, 'minplayers');
  output.maxPlayers = getIntOf(gameEntry, 'maxplayers');
  output.minPlayerAge = getIntOf(gameEntry, 'age');
  output.playTime = getIntOf(gameEntry, 'playingtime');
  output.minPlayTime = getIntOf(gameEntry, 'minplaytime');
  output.maxPlayTime = getIntOf(gameEntry, 'maxplaytime');

  // If we got the list of ratings, include the average weight in the extract.
  if (ratings !== undefined) {
    output.complexity = getFloatOf(ratings, 'averageweight');
  }

  // Get a list of all of the extended game attributes; each is a list of items
  // that can appear in more than one game and tie games together by some common
  // factor.
  output.category = getAllItemsOf(gameEntry, 'boardgamecategory');
  output.mechanic = getAllItemsOf(gameEntry, 'boardgamemechanic');
  output.designer = getAllItemsOf(gameEntry, 'boardgamedesigner');
  output.artist = getAllItemsOf(gameEntry, 'boardgameartist');
  output.publisher = getAllItemsOf(gameEntry, 'boardgamepublisher');

  return output;
}


/******************************************************************************/


/* Given a BoardGameGeek game ID value, make a query to the BGG XML API to
 * fetch information about that game. Once collected, the XML data will be
 * converted and mapped into the form of our internal objects, gathering just
 * the data we need and discarding the rest.
 *
 * The return value of this will be an object that represents the contents of
 * the game that was looked up; if there is no such game with this ID, then the
 * return value is null.
 *
 * In case of any errors during this operation, we will raise an Exception that
 * allows the calling code to capture the error that occurred. */
export async function bggLookupGame(ctx, bggGameId) {
  // Construct the URI that we want to talk to; we need to ask for stats to get
  // extra information, and also note that there can be no trailing slash after
  // the game ID, or the API freaks out.
  const URI = `${BGG_API_URL}/boardgame/${bggGameId}?stats=1`;

  // Since mid-2025 the BGG API requires every request to be authorized with an
  // application token, the bastards. You can register at:
  //     boardgamegeek.com/applications
  //
  // The token is sent as a bearer token. Without one the API answers 401 for
  // everything.
  const token = ctx.env.BGG_API_TOKEN;

  // Without a token the API just answers 401 with no explanation of its own, so
  // say what is actually wrong right here instead.
  if (token === undefined || token === '') {
    throw new BGGLookupError('BGG API token is not configured; set BGG_API_TOKEN in .dev.vars (see wrangler.jsonc)', 502);
  }

  const options = {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  };

  // Request data from BoardGameGeek; if this request fails, then we can just
  // immediately return the same error.
  const res = await fetch(URI, options);
  if (!res.ok) {
    const why = (res.status === 401)
      ? 'BGG rejected the API token (401); check BGG_API_TOKEN in .dev.vars'
      : `error looking up BGG game record: ${res.statusText}`;

    throw new BGGLookupError(why, res.status);
  }

  // The BGG API returns XML; load the content and parse it into an object. If
  // the input cannot be parsed as XML, the result is an Error.
  const data = sanicXML.parse(await res.text());
  if (data instanceof Error) {
    throw new BGGLookupError('BGG game response was empty or malformed', 502);
  }

  // Try to find the game entry in the result; the game data is nested inside
  // the root boardgames tag. The result might be well formed but empty.
  const root = getChildNamed(data, 'boardgames');
  const gameEntry = (root !== undefined) ? getChildNamed(root, 'boardgame') : undefined;
  if (gameEntry === undefined) {
    throw new BGGLookupError('BGG game response was empty or malformed', 502);
  }

  // We have a game entry; if it has an error tag, it means that there was
  // some issue looking up the data, so return that. For us we're going to
  // assume that the game just doesn't exist, since there is no way to know
  // what other errors might be.
  if (getChildNamed(gameEntry, 'error') !== undefined) {
    return null;
  }

  // Map the data and return it back; this will always return an object.
  return makeBggGameData(gameEntry, parseInt(bggGameId));
}


/******************************************************************************/
