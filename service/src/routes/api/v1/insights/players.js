/******************************************************************************/


import { routeHandler, success, fail } from '@odatnurd/cf-requests';
import { validateZod } from '#legacyvalidator';

import { PlayerStatsParamSchema } from '#schema/insights';

import { dbPlayerStats } from '#db/insights';
import { dbGameLookup } from '#db/game';


/******************************************************************************/


/* Return a Player Stats report for an arbitrary group of people, a single game,
 * or both. At least one of the two is required. Learning sessions are excluded
 * by default and counted in the report so the UI can say so. */
export const $get = routeHandler(
  validateZod('query', PlayerStatsParamSchema),

  async (ctx) => {
    const { players, game, from, to, playType, includeLearning } = ctx.req.valid('query');

    // A game may be named by numeric id or slug. Resolve it first so an unknown
    // value is a 404 rather than an empty report.
    let gameInfo = null;
    if (game !== undefined) {
      const lookup = await dbGameLookup(ctx, game, undefined, false);
      gameInfo = Array.isArray(lookup) ? lookup[0] ?? null : lookup;

      if (gameInfo === null) {
        return fail(ctx, `unable to locate game with id ${game}`, 404);
      }
    }

    const report = await dbPlayerStats(ctx, {
      players,
      gameId: gameInfo?.id,
      from,
      to,
      playType,
      includeLearning
    });

    // The client has its own people store for display names, but the report is
    // more useful when it names the identities it actually aggregated.
    const names = new Map(report.players.map(person => [person.key, person.name]));

    return success(ctx, 'player stats report', {
      scope: {
        players: players.keys.map(key => {
          const [kind, id] = key.split(':');

          return {
            key,
            userId: kind === 'u' ? Number(id) : null,
            guestId: kind === 'g' ? Number(id) : null,
            name: names.get(key) ?? null
          };
        }),
        game: gameInfo === null
          ? null
          : { id: gameInfo.id, slug: gameInfo.slug, name: gameInfo.name },
        from: from ?? null,
        to: to ?? null,
        playType: playType ?? null,
        includeLearning
      },
      ...report
    });
  }
);


/******************************************************************************/
