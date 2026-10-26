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


/* An icon glyph from the local bootstrap library.
 *
 * A title, when given, becomes a native tooltip on the glyph; grid rows are
 * built as plain nodes out here in the light DOM, so the attribute is what the
 * browser reads for the hover text. */
export function icon(name, { color = undefined, size = undefined, title = undefined } = {}) {
  return element('wa-icon', {
    name,
    library: 'bootstrap',
    title,
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


/* Image cells are cached per row and the same node is handed back on every
 * render.
 *
 * The grid runs formatters on every render; its rows are virtualized, so
 * scrolling re-renders them continuously. A fresh node replaces the previous
 * one each time.
 *
 * A freshly built <img> reloads and repaints from scratch, which shows up as
 * visible flicker while scrolling. Reusing the node instance (the remedy the
 * grid's own documentation prescribes for cells that must keep their DOM state)
 * keeps the picture mounted and the scroll clean.
 *
 * The cache is a WeakMap keyed by the row object: entries vanish along with
 * their data set, and two grids that happen to show the same picture each
 * get their own node instead of fighting over one. */
const imageCache = new WeakMap();

/* A small icon sized box art image, as used in the dedicated image column of
 * the various game lists. Returns an empty string when there is no image. */
export function image(imagePath, row) {
  if (imagePath === undefined || imagePath === null || imagePath === '') {
    return '';
  }

  // Rows always come from the grid, but be safe about the cache key.
  if (row === undefined || row === null) {
    return element('img', {
      src: imagePath,
      alt: 'thumbnail',
      class: 'cell-image',
      style: 'display:block;margin:0 auto;width:32px;height:32px;object-fit:contain;border-radius:var(--wa-border-radius-small);'
    });
  }

  let cells = imageCache.get(row);
  if (cells === undefined) {
    cells = {};
    imageCache.set(row, cells);
  }

  const key = String(imagePath);
  if (cells[key] === undefined) {
    cells[key] = element('img', {
      src: imagePath,
      alt: row.name ?? 'thumbnail',
      class: 'cell-image',
      style: 'display:block;margin:0 auto;width:32px;height:32px;object-fit:contain;border-radius:var(--wa-border-radius-small);'
    });
  }

  return cells[key];
}


/* A row of things, laid out horizontally with small gaps. */
export function group(...children) {
  return element('span', {
    class: 'cell-group',
    style: 'display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;'
  }, children);
}


/******************************************************************************/
