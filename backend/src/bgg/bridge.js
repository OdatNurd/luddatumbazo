/******************************************************************************/


import parseXML from "@axel669/sanic-xml/parse";
import { decodeHTML } from "entities";
import slug from "slug";


/******************************************************************************/


const BGG_API_URL = 'https://boardgamegeek.com/xmlapi'


/******************************************************************************/


/* This is a simple helper method that can be used to transmit back an error
 * message in a known format. */
const error = (ctx, status, reason) => {
  ctx.status(status);
  return ctx.json({ success: false, reason });
}


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
function mapBoardgame(gameEntry, gameId) {
  // The BGG API returns a list of top level board game tags in case the request
  // made is for more than one game; we only ever ask for one though.
  //
  // So, pluck the first tag out, which will be the entry for the boardgame
  // itself.
  if (gameEntry.length !== 1) {
    return null;
  }
  const input = getChildNamed(gameEntry[0], 'boardgame');

  // Start preparing our output structure by including the BoardGameGeek ID for
  // this game in it.
  const output = { "gameId": gameId };

  // This record tells us if a game either has an expansion or IS an expansion;
  // when this IS an expansion (inbound is an attribute), store a record of
  // this.
  const expansion = getChildNamed(input, 'boardgameexpansion');
  if (expansion !== null && expansion.attr?.inbound !== undefined) {
    output.expandsGame = parseInt(expansion.attr.objectid);
  }

  // The statistics node will us the average game weight, presuming that the
  // incoming request asked for it. If so, pull it out.
  const statistics = getChildNamed(input, 'statistics');
  const ratings = (statistics === null) ? null : getChildNamed(statistics, 'ratings');

  // Grab all of the name nodes, and sort them by text, bringing the primary
  // item to the top of the list.
  output.name = getGameNames(input);

  // Get the core game details.
  output.published = getIntOf(input, 'yearpublished');
  output.minPlayers = getIntOf(input, 'minplayers');
  output.maxPlayers = getIntOf(input, 'maxplayers');
  output.minPlayerAge = getIntOf(input, 'age');

  output.playTime = getIntOf(input, 'playingtime');
  output.minPlayTime = getIntOf(input, 'minplaytime');
  output.maxPlayTime = getIntOf(input, 'maxplaytime');

  output.description = decodeHTML(getTextOf(input, 'description'));
  output.thumbnail = getTextOf(input, 'thumbnail');
  output.image = getTextOf(input, 'image');

  if (ratings !== null) {
    output.complexity = getFloatOf(ratings, 'averageweight');
  }

  // Get a list of all of the extended game attributes; each is a list of items
  // that can appear in more than one game and tie games together by some common
  // factor.
  output.category = getAllItemsOf(input, 'boardgamecategory');
  output.mechanic = getAllItemsOf(input, 'boardgamemechanic');
  output.designer = getAllItemsOf(input, 'boardgamedesigner');
  output.artist = getAllItemsOf(input, 'boardgameartist');
  output.publisher = getAllItemsOf(input, 'boardgamepublisher');

  return output;
}

/******************************************************************************/


/* Input:
 *   gameId as a request path parameter which represents a BGG Game ID
 *
 * This will look up the board game in the BoardGameGeek API for the game ID
 * that is given, and will return back a JSON encoded version of the data for
 * that game.
 *
 * This includes the core information on the game, as well as additional info
 * such as the list of designers, artists, and so on. */
export async function lookupBGGGameInfo(ctx) {
  const { gameId } = ctx.req.param();
  const URI = `${BGG_API_URL}/boardgame/${gameId}?stats=1`;

  const res = await fetch(URI, {
    method: "GET",
  });

  if (!res.ok) {
    return error(ctx, res.status, `error while looking up BGG Game Info: ${res.statusText}`)
  }

  const data = parseXML(await res.text());
  return ctx.json(mapBoardgame(data, parseInt(gameId)));
}



/******************************************************************************/
