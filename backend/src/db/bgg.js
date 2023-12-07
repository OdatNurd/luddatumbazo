/******************************************************************************/


import parseXML from "@axel669/sanic-xml/parse";
import { decodeHTML } from "entities";
import slug from "slug";

import { BGGLookupError } from './exceptions.js';
import { success, fail } from "./common.js";


/******************************************************************************/


// The root API that we use to talk to BoardGameGeek in order to gather data.
const BGG_API_URL = 'https://boardgamegeek.com/xmlapi';


/******************************************************************************/


/* Given a particular array of input nodes, return back the first tag found
 * whose name is the one that is passed in.
 *
 * If there is no such node found, this will return undefined. */
const getChildNamed = (input, name) => input.children.find(el => el.tag === name);


/* Given a particular array of input nodes, return back a list of all of the
 * tags found which have that name.
 *
 * The return value is always an array, although it may be empty. */
const getChildrenNamed = (input, name) => input.children.filter(el => el.tag === name);


/* Given a particular array of input nodes, find the first node whose tag is
 * the one named and, if found, return it's textual content (if any).
 *
 * This will return undefined if the tag is not found, or if the tag has no
 * text. */
const getTextOf = (input, name) => {
  const node = getChildNamed(input, name);
  if (node && node.children.length > 0) {
    return node.children[0]?.text;
  }

  return undefined;
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
  .filter(el => el.children.length > 0 && el.attr?.objectid !== undefined)
  .map(el => {
    return {
      "bggId": parseInt(el.attr.objectid),
      "name": decodeHTML(el.children[0].text)
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
  if (left.attr?.primary) return -1;
  if (right.attr?.primary) return 1;

  // Fall back to sorting based on the child text.
  const lText = (left.children.length > 0) ? left.children[0]?.text : undefined;
  const rText = (right.children.length > 0) ? right.children[0]?.text : undefined;

  // Return the appropriate locale comparison value; Sort a missing item to
  // come after those which exist; when both exist, return the comparison.
  if (lText === undefined) {
    return 1;
  } else if (rText == undefined) {
    return -1;
  } else {
    return lText.localeCompare(rText, 'en', {sensitivity: 'base'});
  }
}).map(el => decodeHTML(el.children[0].text));


/******************************************************************************/


/* Given a sanic-xml JSON representation of a BoardGameGeek BoardGame API
 * response for a specific board game entry, convert it into a normalized JSON
 * form and return the value back. */
function makeBggGameData(gameEntry, gameId) {
  // Start preparing our output structure by including the BoardGameGeek ID for
  // this game in it.
  const output = { "bggId": gameId };

  // This record tells us if a game either has an expansion or IS an expansion;
  // when this IS an expansion (inbound is an attribute), store a record of
  // this.
  const expansion = getChildNamed(gameEntry, 'boardgameexpansion');
  if (expansion !== undefined && expansion.attr?.inbound !== undefined) {
    output.expandsGame = parseInt(expansion.attr.objectid);
  }

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
  }

  // Pull in the basic information about the game
  output.description = decodeHTML(getTextOf(gameEntry, 'description'));
  output.thumbnail = getTextOf(gameEntry, 'thumbnail');
  output.image = getTextOf(gameEntry, 'image');

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
 * allows the calling code to capture the error that occured. */
export async function lookupBGGGame(bggGameId) {
  // Construct the URI that we want to talk to; we need to ask for stats to get
  // extra information, and also note that there can be no trailing slash after
  // the game ID, or the API freaks out.
  const URI = `${BGG_API_URL}/boardgame/${bggGameId}?stats=1`;

  // Request data from BoardGameGeek; if this request fails, then we can just
  // immediately return the same error.
  const res = await fetch(URI, { method: "GET" });
  if (!res.ok) {
    throw BGGLookupError(`error looking up BGG game record: ${res.statusText}`, res.status);
  }

  // The BGG API returns XML; load the content and parse it into an object;
  // this will always return a list, even if the input is not XML, because
  // that's how sanic-xml rolls.
  const data = parseXML(await res.text());

  // Try to find the game entry in the result; the result will be an array of
  // games, but we only ever ask for one. However, the result might be
  // malformed and thus empty.
  const gameEntry = (data.length === 1) ? getChildNamed(data[0], 'boardgame') : undefined;
  if (gameEntry === undefined) {
    throw BGGLookupError('BGG game response was empty or malformed', 502);
  }

  // We have a game entry; if it has an error tag, it means that there was
  // some issue looking up the data, so return that. For us we're going to
  // assume that the game just doesn't exist, since there is no way to know
  // what other errors might be.
  if (getChildNamed(gameEntry, 'error')) {
    return null;
  }

  // Map the data and return it back; this will always return an object.
  return makeBggGameData(gameEntry, parseInt(bggGameId));
}


/******************************************************************************/


/* Input:
 *   bggGameId as a request path parameter which represents a BGG Game ID
 *
 * This will look up the board game in the BoardGameGeek API for the game ID
 * that is given, and will return back a JSON encoded version of the data for
 * that game.
 *
 * This includes the core information on the game, as well as additional info
 * such as the list of designers, artists, and so on. */
export async function lookupBGGGameInfo(ctx) {
  const { bggGameId } = ctx.req.param();

  try {
    // Try to get the game data; if this returns NULL it means that there is no
    // such game (or BGG has some other error but they use human readable text
    // for those, so we just assume they're all the same error).
    const gameInfo = await lookupBGGGame(bggGameId);
    if (gameInfo === null) {
      return fail(ctx, `BGG has no record of game with ID ${bggGameId}`, 404);
    }

    // The record seems valid, so parse it out and return back the result.
    return success(ctx, `information on BGG game ${bggGameId}`, gameInfo);
  }
  catch (err) {
    // Handle BGG Lookup Errors specially.
    if (err instanceof BGGLookupError) {
      return fail(ctx, err.message, err.status);
    }

    return fail(ctx, "unknown error while looking up BGG game info", 502);
  }
}


/******************************************************************************/