/******************************************************************************/


import { raw } from './fetch.js';


/******************************************************************************/


/* Fetch a Player Stats report. The API requires at least one player key or a
 * game; empty/default values are omitted so the URL stays readable. */
async function playerStats(filters = {}) {
  const options = {};

  if (Array.isArray(filters.players) && filters.players.length > 0) {
    options.players = filters.players.join(',');
  }

  if (filters.game !== undefined && filters.game !== '') {
    options.game = filters.game;
  }

  if (filters.from !== undefined && filters.from !== '') {
    options.from = filters.from;
  }

  if (filters.to !== undefined && filters.to !== '') {
    options.to = filters.to;
  }

  if (filters.playType !== undefined && filters.playType !== '') {
    options.playType = filters.playType;
  }

  if (filters.includeLearning === true) {
    options.includeLearning = 'true';
  }

  return raw.get('/insights/players', options);
}


/******************************************************************************/


export const insights = {
  players: playerStats,
};


/******************************************************************************/
