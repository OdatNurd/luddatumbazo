/******************************************************************************/


/* DOM cell builders for the Web Awesome data grid.
 *
 * WaDataGrid column formatters can return a string, a Lit template, or a plain
 * DOM node. Since this application is Svelte rather than Lit, rich cell content
 * is built here as plain nodes; they're small enough that this stays tidy and
 * keeps us free of any extra templating dependency.
 *
 * The grid renders these nodes inside of its own shadow tree, which the
 * application stylesheet cannot reach, so any styling on them is applied
 * inline right here. */


/******************************************************************************/


/* Wrap some nodes in an element with the given attributes. */
function element(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) {
      node.setAttribute(key, value);
    }
  }

  for (const child of children) {
    node.append(child);
  }

  return node;
}


/******************************************************************************/


/* A plain text cell; returned as a string so the grid escapes it. */
export function text(value) {
  return (value === undefined || value === null) ? '' : String(value);
}


/* An icon glyph from the local bootstrap library. */
export function icon(name, { color = undefined, size = undefined } = {}) {
  return element('wa-icon', {
    name,
    library: 'bootstrap',
    style: [color && `color:${color}`, size && `font-size:${size}`].filter(Boolean).join(';')
  });
}


/* An internal (hash) or external link, optionally with a trailing external link
 * glyph. */
export function link(href, label, { external = false, icon: iconName = undefined } = {}) {
  const anchor = element('a', { href }, [text(label)]);

  if (external === true) {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noreferrer');
  }

  if (iconName !== undefined) {
    anchor.append(' ', icon(iconName));
  }

  return anchor;
}


/* A small icon sized box art image, as used in the dedicated image column of
 * the various game lists. Returns an empty string when there is no image. */
export function image(imagePath, name) {
  if (imagePath === undefined || imagePath === null || imagePath === '') {
    return '';
  }

  return element('img', {
    src: imagePath,
    alt: name ?? 'thumbnail',
    class: 'cell-image',
    style: 'display:block;margin:0 auto;width:32px;height:32px;object-fit:contain;border-radius:var(--wa-border-radius-small);'
  });
}


/* A row of things, laid out horizontally with small gaps. */
export function group(...children) {
  return element('span', {
    class: 'cell-group',
    style: 'display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;'
  }, children);
}


/******************************************************************************/
