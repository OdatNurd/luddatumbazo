/* Shared behavior for the authentication notice pages.
 *
 * The pages are static files, so the details of what happened are passed in as
 * query parameters and filled in here; text is only ever applied via
 * textContent, so a hostile message cannot inject markup into the page. */

const params = new URLSearchParams(window.location.search);

// The human readable description of what happened, if one was supplied.
const message = params.get('message');
if (message !== null) {
  const target = document.querySelector('[data-notice-message]');
  if (target !== null) {
    target.textContent = message;
  }
}

// The "switch user" link, when the page has one; it kills the provider session
// so that a different person can log in. Without a target the link is hidden.
const switchUser = params.get('switchUser');
const switchLink = document.querySelector('[data-notice-switch-user]');
if (switchLink !== null) {
  if (switchUser !== null) {
    switchLink.href = switchUser;
  }
  else {
    switchLink.remove();
  }
}
