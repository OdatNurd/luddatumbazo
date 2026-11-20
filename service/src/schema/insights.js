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


/* An optional min/max window. An absent bound means "any". */
const BoundsSchema = z.object({
  min: z.number().min(0).optional(),
  max: z.number().min(0).optional()
}).refine(value => value.min === undefined || value.max === undefined || value.min <= value.max, {
  message: 'min must not be greater than max'
});


const PlayerKeyListSchema = z.array(z.string().regex(/^[ug]:\d+$/)).default([]);


/******************************************************************************/


/* A normalised Game Picker filter. Every field is optional on input so a saved
 * filter can be posted back unchanged; the transform fills in the defaults and
 * the shape stored in GamePickerFilter.filterJson. */
export const PickerFilterSchema = z.object({
  version: z.literal(1).optional(),

  players: BoundsSchema.optional(),
  time: BoundsSchema.extend({ mode: z.enum(['overlap']).optional() }).optional(),
  complexity: BoundsSchema.optional(),

  categories: z.array(z.string()).optional(),
  mechanics: z.array(z.string()).optional(),

  history: z.object({
    enabled: z.boolean().optional(),
    players: PlayerKeyListSchema.optional(),
    from: z.string().datetime().optional(),
    mode: z.enum(['exclude', 'include']).optional()
  }).optional()
})
  .superRefine((value, zCtx) => {
    if (value.history?.enabled === true && (value.history.players ?? []).length === 0) {
      zCtx.addIssue({
        code: 'custom',
        message: 'history requires at least one player',
        path: ['history', 'players']
      });
    }
  })
  .transform(value => {
    const bounds = window => {
      const result = {};
      if (window?.min !== undefined) {
        result.min = window.min;
      }
      if (window?.max !== undefined) {
        result.max = window.max;
      }
      return result;
    };

    return {
      version: 1,
      players: bounds(value.players),
      time: { ...bounds(value.time), mode: 'overlap' },
      complexity: bounds(value.complexity),
      categories: [...new Set(value.categories ?? [])],
      mechanics: [...new Set(value.mechanics ?? [])],
      history: {
        enabled: value.history?.enabled === true,
        players: [...new Set(value.history?.players ?? [])],
        mode: value.history?.mode === 'include' ? 'include' : 'exclude',
        ...(value.history?.from === undefined ? {} : { from: value.history.from })
      }
    };
  });


/******************************************************************************/


/* The body of a picker search. The filter is required so the server always has
 * a complete, validated object to query and to store. */
export const PickerSearchSchema = z.object({
  filter: PickerFilterSchema,
  excludeGameId: z.number().int().positive().optional()
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
