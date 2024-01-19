/******************************************************************************/


import { Hono } from 'hono'

import { wrappedRequest as _, success, fail, validate } from '#requests/common';

import { BGGGameIDSchema } from '#schema/bgg';

import { lookupBGGGame } from '#db/bgg';


/******************************************************************************/


/* Input:
 *   bggId as a request path parameter which represents a BGG Game ID
 *
 * This will look up the board game in the BoardGameGeek API for the game ID
 * that is given, and will return back a JSON encoded version of the data for
 * that game.
 *
 * This includes the core information on the game, as well as additional info
 * such as the list of designers, artists, and so on. */
async function lookupBGGGameReq(ctx) {
  const { bggId } = ctx.req.valid('param');

  // Try to get the game data; if this returns NULL it means that there is no
  // such game (or BGG has some other error but they use human readable text
  // for those, so we just assume they're all the same error).
  const gameInfo = await lookupBGGGame(bggId);
  if (gameInfo === null) {
    return fail(ctx, `BGG has no record of game with ID ${bggId}`, 404);
  }

  // The record seems valid, so parse it out and return back the result.
  return success(ctx, `information on BGG game ${bggId}`, gameInfo);
}


/******************************************************************************/


/* Create a small "sub-application" to wrap all of our routes, and then
 * map all routes in. */
export const bgg = new Hono();


bgg.get('/boardgame/:bggId',
        validate('param', BGGGameIDSchema),
        ctx => _(ctx, lookupBGGGameReq));


/******************************************************************************/
