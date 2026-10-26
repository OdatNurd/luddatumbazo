/******************************************************************************/


import { authGetUser, applySessionRenewal } from '#lib/auth/index';
import { deniedURL } from '#lib/auth/pages';


/******************************************************************************/


/* The gatekeeper for the application shell.
 *
 * Now that nothing sits in front of the worker doing authentication for us, the
 * worker itself has to decide who gets to see the client. This intercepts the
 * root URL (the hash routed client always loads from there) and:
 *
 *   - shows the styled access denied page if the identity provider bounced
 *     back to us with an error,
 *   - sends the browser off to start a login if the request carries none of
 *     the credentials the auth system knows about (the same sources the API
 *     accepts: a session, the service token or the development token),
 *   - and otherwise serves up the client shell as normal.
 *
 * Everything else is handed straight along; API and file routes carry their own
 * guards, and static assets are only ever reachable through the asset layer. */
export const $any = [
  async (ctx, next) => {
    // The gatekeeper only guards the application shell itself.
    if (ctx.req.path !== '/') {
      await next();
      return;
    }

    // If the identity provider reported an error while authenticating (e.g. the
    // user is valid but has no access to this application), let the styled
    // denial page describe what happened.
    const error = ctx.req.query('error');
    if (error !== undefined) {
      return ctx.redirect(deniedURL(ctx, ctx.req.query('error_description') ?? error));
    }

    // Without a valid credential the browser is sent off to start a login; the
    // client keeps any deep link it was given, so after the round trip the user
    // lands back where they were headed. Checking through the full auth entry
    // point (rather than the session alone) keeps the service and development
    // token paths able to load the client during local development.
    const userId = await authGetUser(ctx);
    if (userId === null) {
      return ctx.redirect('/login');
    }

    // Authentication passed, so go ahead and serve the actual asset that was
    // requested now (which is the client shell).
    const res = await ctx.env.STATICS.fetch(ctx.req.raw);
    return applySessionRenewal(ctx, res);
  }
]


/******************************************************************************/
