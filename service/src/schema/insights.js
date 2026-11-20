/******************************************************************************/


import { z } from 'zod';

import { PlayerFilterSchema, sessionPlayTypes } from '#schema/session';


/******************************************************************************/


/* Parse the optional game identifier. A query string carries numbers as text,
 * but the game lookup treats a string as a slug, so a purely numeric value is
 * converted back to a number first. */
const GameRefSchema = z.string().optional().transform(value => {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  return /^\d+$/.test(value) ? Number(value) : value;
});


/******************************************************************************/


/* The query for a Player Stats report. A report needs at least one person or a
 * game; learning sessions are excluded unless asked for. */
export const PlayerStatsParamSchema = z.object({
  players: PlayerFilterSchema,

  game: GameRefSchema,

  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),

  playType: z.enum(sessionPlayTypes).optional(),

  includeLearning: z.enum(['true', 'false']).optional()
    .transform(value => value === undefined ? false : value === 'true')
})
  .refine(value => value.players.keys.length > 0 || value.game !== undefined, {
    message: 'provide at least one player or a game',
    path: ['players']
  })
  .refine(value => {
    if (value.from === undefined || value.to === undefined) {
      return true;
    }

    return Date.parse(value.from) <= Date.parse(value.to);
  }, {
    message: 'from must not be after to',
    path: ['from']
  });


/******************************************************************************/
