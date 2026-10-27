/******************************************************************************/


/* Toast notifications backed by Web Awesome's toast stack.
 *
 * A single <wa-toast> host is created lazily and appended to the document
 * body; every toast() call creates its notification in that stack. */


/******************************************************************************/


let host = null;

function toastHost() {
  if (host === null || document.body.contains(host) === false) {
    host = document.createElement('wa-toast');
    document.body.append(host);
  }

  return host;
}


/******************************************************************************/


/* Show a toast notification; options may include variant ('primary', 'success',
 * 'neutral', 'warning', 'danger'), icon, closable and duration (in ms; omit for
 * a toast that stays until dismissed). */
export function toast(message, options = {}) {
  return toastHost().create(message, {
    variant: 'neutral',
    closable: true,
    duration: 3000,
    ...options
  });
}


/******************************************************************************/
