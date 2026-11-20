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


/* Draw a game from the household shelf. Passing the current pick as
 * excludeGameId removes it from the next draw when another match exists. */
async function pickerSearch(filter, excludeGameId = undefined) {
  return raw.post('/insights/picker/search', {
    filter,
    excludeGameId
  });
}


/******************************************************************************/


/* Saved filters are shared by the household; all four calls are scoped to the
 * signed-in user's primary household on the server. */
async function savedFilterList() {
  return raw.get('/insights/picker/filters');
}

async function savedFilterCreate(name, filter) {
  return raw.post('/insights/picker/filters', { name, filter });
}

async function savedFilterUpdate(filterId, changes) {
  return raw.put(`/insights/picker/filters/${filterId}`, changes);
}

async function savedFilterDelete(filterId) {
  return raw.delete(`/insights/picker/filters/${filterId}`);
}


/******************************************************************************/


export const insights = {
  players: playerStats,
  picker: {
    search: pickerSearch,
    filters: {
      list: savedFilterList,
      create: savedFilterCreate,
      update: savedFilterUpdate,
      remove: savedFilterDelete
    }
  }
};


/******************************************************************************/
