/******************************************************************************/


import { appOrigin, providerOrigin } from './oidc.js';


/******************************************************************************/


/* The notice pages are plain styled HTML files that live with the rest of the
 * client output; they exist so that the failure states of the login flow look
 * like a part of the application rather than like error strings dropped into
 * the browser.
 *
 * These helpers build the URLs that lead to them, including whatever query
 * parameters the pages need in order to describe what happened. */


/******************************************************************************/


/* Note that the asset layer serves the .html files of the notice pages at
 * clean, extensionless URLs, which is the form used everywhere else. */


/******************************************************************************/


/* The URL of the styled access denied page.
 *
 * This is shown when the identity provider says that the user is valid but not
 * permitted to use the application (or when the flow fails on the provider side
 * for some other reason). The page is given the description of the problem, and
 * a link that kills the provider session so that the user can log in as
 * somebody else. */
export function deniedURL(ctx, message) {
  const switchUser = `${providerOrigin(ctx)}/logout` +
                     `?rd=${encodeURIComponent(`${appOrigin(ctx)}/login`)}`;

  const params = new URLSearchParams({
    message: message ?? 'You do not have permission to access this application.',
    switchUser
  });

  return `/notice/denied?${params}`;
}


/******************************************************************************/


/* The URL of the styled generic authentication error page; this is used when
 * the login flow cannot be completed for a technical reason (a missing flow
 * cookie, a failed token exchange and so forth). */
export function authErrorURL(message) {
  return `/notice/auth-error?${new URLSearchParams({ message })}`;
}


/******************************************************************************/


/* The URL of the styled logged out page. */
export function loggedOutURL() {
  return `/notice/logged-out`;
}


/******************************************************************************/


/* Sanitize a return path that came in from the client so that it is safe to use
 * in a redirect.
 *
 * The application is hash routed, so only fragment style paths of the form
 * '#/...' are ever accepted; anything at all questionable and the user is sent
 * to the front page instead. */
export function safeReturnPath(returnTo) {
  const suspicious = /[\r\n\s"'\\<>]/;

  if (typeof returnTo === 'string' && returnTo.startsWith('#/') &&
      suspicious.test(returnTo) === false) {
    return `/${returnTo}`;
  }

  return '/';
}


/******************************************************************************/
