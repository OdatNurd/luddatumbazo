/******************************************************************************/


import { clearSessionCookieHeader } from '#lib/auth/index';
import { loggedOutURL } from '#lib/auth/pages';


/******************************************************************************/


/* Log out of the application.
 *
 * This is deliberately simple; the application session is dropped and the user
 * is shown a styled page that offers them the chance to log back in. The
 * identity provider session is not touched here, so logging back in is quick
 * unless the provider session has also lapsed. */
export const $get = async (ctx) => {
  const res = ctx.redirect(loggedOutURL());
  res.headers.append('Set-Cookie', clearSessionCookieHeader());
  return res;
};


/******************************************************************************/
