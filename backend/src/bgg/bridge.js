/******************************************************************************/


import parseXML from "@axel669/sanic-xml/parse";


/******************************************************************************/


const BGG_API_URL = 'https://boardgamegeek.com/xmlapi'


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

  // Get either a single child tag or all of the child tags of a given name.
  const getChildNamed = name => input.children.find(el => el.tag === name);
  const getChildrenNamed = name => input.children.filter(el => el.tag === name);

  // Get the text of a particular child node, interpreted as either text or a
  // number.
  const getTextOf = name => getChildNamed(name).children[0].text;
  const getIntOf = name => parseInt(getChildNamed(name).children[0].text);

  // Find all child tags of the given name and return an array that contains all
  // of their text.
  const getAllTextOf = name => getChildrenNamed(name).map(el => el.children[0].text);

  // console.log(JSON.stringify(getChildrenNamed('name')));
  const output = {"gameId": gameId}

  // Grab all of the name nodes, and sort them by text, bringing the primary
  // item to the top of the list.
  output.name = getChildrenNamed('name').sort((l, r) => {
    // If either node has a "primary" attribute, sort it first
    if (l?.attr?.primary) return -1;
    if (r?.attr?.primary) return 1;

    // Fall back to sorting based on the child text.
    const lText = l.children[0].text;
    const rText = r.children[0].text;
    const result = lText.localeCompare(rText, 'en', {sensitivity: 'base'});

    return result;
  }).map(el => el.children[0].text);

  output.published = getIntOf('yearpublished')
  output.minPlayers = getIntOf('minplayers')
  output.maxPlayers = getIntOf('maxplayers')
  output.playTime = getIntOf('playingtime')
  output.minPlayTime = getIntOf('minplaytime')
  output.maxPlayTime = getIntOf('maxplaytime')
  output.minPlayerAge = getIntOf('age')
  output.description = getTextOf('description')
  output.thumbnail = getTextOf('thumbnail')
  output.image = getTextOf('image')

  output.category = getAllTextOf('boardgamecategory');
  output.mechanic = getAllTextOf('boardgamemechanic');
  output.designer = getAllTextOf('boardgamedesigner');
  output.artist = getAllTextOf('boardgameartist');
  output.publisher = getAllTextOf('boardgamepublisher');

  // Best players; parse this poll and return the number of players where
  // "Best" has the most votes
  //
  //<poll name="suggested_numplayers" title="User Suggested Number of Players" totalvotes="130">

  // Communuity suggested player age; parse this poll and return the age that
  // has the most votes.
  //
  // <poll name="suggested_playerage" title="User Suggested Player Age" totalvotes="19">


  // Gather the average weight (out of 5)
  //
  // <statistics><ratings><averageweight>

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
