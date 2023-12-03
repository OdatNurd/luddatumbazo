/******************************************************************************/


import parseXML from "@axel669/sanic-xml/parse";


/******************************************************************************/


const BGG_API_URL = 'https://boardgamegeek.com/xmlapi'


/******************************************************************************/


// Get either a single child tag or all of the child tags of a given name.
const getChildNamed = (input, name) => input.children.find(el => el.tag === name);
const getChildrenNamed = (input, name) => input.children.filter(el => el.tag === name);

// Get the text of a particular child node, interpreted as either text or a
// number.
const getTextOf = (input, name) => getChildNamed(input, name).children[0].text;
const getIntOf = (input, name) => parseInt(getChildNamed(input, name).children[0].text);
const getFloatOf = (input, name) => parseFloat(getChildNamed(input, name).children[0].text);

// Find all child tags of the given name and return an array that contains all
// of their text.
const getAllTextOf = (input, name) => getChildrenNamed(input, name).map(el => el.children[0].text);

// Find all of the nodes that have the given name, and return back a list of
// objects that tell you the BGG ID and name associated with each.
const getAllItemsOf = (input, name) => getChildrenNamed(input, name).map(el => {
  return {
    "bggId": parseInt(el.attr.objectid),
    "name": el.children[0].text
  }
});

// Grab all of the name nodes, and sort them by text, bringing the primary
// item to the top of the list.
const getAllGameNames = input => getChildrenNamed(input, 'name').sort((l, r) => {
  // If either node has a "primary" attribute, sort it first
  if (l?.attr?.primary) return -1;
  if (r?.attr?.primary) return 1;

  // Fall back to sorting based on the child text.
  const lText = l.children[0].text;
  const rText = r.children[0].text;
  const result = lText.localeCompare(rText, 'en', {sensitivity: 'base'});

  return result;
}).map(el => el.children[0].text);

// Scan for all of the poll nodes and return back the one whose name is the
// one provided.
const getPollNamed = (input, name) => {
  const results = getChildrenNamed(input, 'poll').filter(el => el.attr.name === name);
  return (results.length !== 1) ? null : results[0];
}

// Given a result set tag and a desired attribute name within that tag, return
// back an object where the key is the value of the attribute on the results tag
// and the value is the name of the value that is highest voted.
//
// If the results tag doesn't have such an attribute, a placeholder is used
// instead.
//
// If there are no items that are voted higher than any other, the value null
// will come back to indicate that nobody voted at all.
const getVotedPollResult = (resultSet, resultAttr) => {
  let highest = 0;

  const retVal = {};
  const key = resultSet.attr[resultAttr] ?? 'result';

  retVal[key] = null;

  getChildrenNamed(resultSet, 'result').forEach(result => {
    const theseVotes = parseInt(result.attr.numvotes);
    if (theseVotes > highest) {
      highest = theseVotes;
      retVal[key] = result.attr.value;
    }
  });

  return retVal;
}

// Find the poll with the given name, and return back a mapping which gives a
// lists the highest voted item in each result set. The provided attribute on
// the <results> tag will be the key, with the value being the value of the
// item within that set of results that was voted highest.
//
// Such a value can be NULL if none of the items in the group got a vote.
const getPollResults = (input, pollName, resultAttr) => {
  const poll = getPollNamed(input, pollName);
  if (poll !== null) {
    return getChildrenNamed(poll, 'results').map(el => getVotedPollResult(el, resultAttr));
  }

  return null;
}

/******************************************************************************/


/* Given a JSON representation of a BoardGameGeek boardgame API response (with
 * stats information in it), return back a friendly JSON version that has all
 * of the information that we require from the record. */
function mapBoardgame(input, gameId) {
  // Input request is a list of top level boardgames tags; we only request a
  // single game, so pluck the first tag. The only interesting thing about that
  // tag is it's attribute, which gives us the gameID that we already knew about
  // so no need to keep it. Just grab the first child, which is the actual
  // game data content.
  input = input[0].children[0];

  // Start preparing our output structure
  const output = { "gameId": gameId };

  // This record tells us if a game either has an expansion or IS an expansion;
  // when this IS an expansion (inbound is an attribute), store a record of
  // this.
  const expansion = getChildNamed(input, 'boardgameexpansion');
  if (expansion !== null && expansion?.attr?.inbound !== undefined) {
    output.expandsGame = parseInt(expansion.attr.objectid);
  }

  // The data will contain a poll for the recommended age, which may be different
  // than the publisher's rated age. Gather the results of that poll; this
  // may end up with a value that is null, in which case no vote has yet been
  // taken.
  const suggestedAge = getPollResults(input, 'suggested_playerage')[0].result;

  // The data will contain a poll for the recommended and best player ranges.
  // This is in the form of a range of recommended players (as a min and max),
  // and a best number of players, which is a single number.
  //
  // The polls have values of: Not Recommended, Recommended, Best
  // We want to pull the values where there is a best, but if there is not a
  // best, then fill it in with a recommended value instead. Best possible case
  // is two Bests, worst possible case is two Recommended.
  console.log(getPollResults(input, 'suggested_numplayers', 'numplayers'))

  // The statistics node will us the average game weight, presuming that the
  // incoming request asked for it. If so, pull it out.
  const statistics = getChildNamed(input, 'statistics');
  const ratings = (statistics === null) ? null : getChildNamed(statistics, 'ratings');

  // Grab all of the name nodes, and sort them by text, bringing the primary
  // item to the top of the list.
  output.name = getAllGameNames(input);

  // Get the core game details.
  output.published = getIntOf(input, 'yearpublished');
  output.minPlayers = getIntOf(input, 'minplayers');
  output.maxPlayers = getIntOf(input, 'maxplayers');

  output.playTime = getIntOf(input, 'playingtime');
  output.minPlayTime = getIntOf(input, 'minplaytime');
  output.maxPlayTime = getIntOf(input, 'maxplaytime');

  // There is always a minimum age; if the community has voted, there will also
  // be a suggest age as well; if they have not, there is no suggestedAge.
  output.minPlayerAge = getIntOf(input, 'age');
  if (suggestedAge !== null) {
    output.suggestedAge = parseInt(suggestedAge);
  }

  output.description = getTextOf(input, 'description');
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

  // Diplomacy is 2-7, recommended 6-7, best with 7
  return output;
}

/******************************************************************************/


export async function lookupBGGGameInfo(ctx) {
  const { gameId } = ctx.req.param();
  const URI = `${BGG_API_URL}/boardgame/${gameId}?stats=1`;

  const res = await fetch(URI, {
    method: "GET",
  });

  if (!res.ok) {
    return ctx.json({"failed": "yep"});
  }

  const raw = await res.text();
  const data = parseXML(raw);
  return ctx.json(mapBoardgame(data, parseInt(gameId)));
}



/******************************************************************************/
