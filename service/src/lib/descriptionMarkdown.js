import { parse } from 'node-html-parser';
import { decodeHTML } from 'entities';


/******************************************************************************/


/* BGG has returned descriptions in two shapes over the life of the data: legacy
 * HTML with <br>, <a> and similar tags, and newer plain text with paragraph
 * breaks and unresolved entities. Everything that enters the database must be
 * Markdown.
 *
 * This module deliberately owns both the markup rules and the entity rules so
 * that imports and the one-time migration produce identical output. It uses a
 * small, explicit emitter rather than a library default because the shape of a
 * BGG description (especially runs of <br>) matters more than general-purpose
 * HTML conversion.
 */


/******************************************************************************/


/* Tags that make an input worth parsing as HTML. Unknown tags from BGG are
 * still handled by the import path, which always runs the converter; this set
 * is mainly the conservative migration detector so that Markdown containing a
 * stray less-than sign is not rewritten by accident. */
const HTML_TAGS = [
  'a', 'abbr', 'address', 'article', 'aside', 'b', 'bdi', 'bdo',
  'blockquote', 'br', 'button', 'caption', 'center', 'cite', 'code',
  'col', 'colgroup', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt',
  'em', 'embed', 'fieldset', 'figcaption', 'figure', 'font', 'footer',
  'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i',
  'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main',
  'mark', 'nav', 'noscript', 'object', 'ol', 'p', 'picture', 'pre', 'q',
  's', 'samp', 'section', 'select', 'small', 'source', 'span', 'strike',
  'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr', 'tt', 'u', 'ul', 'var', 'video', 'wbr'
];

const HTML_TAG_PATTERN = new RegExp(
  `<\\/?(?:${HTML_TAGS.join('|')})(?:\\s[^<>]*)?\\/?>`,
  'i'
);

/* Unknown tags are still markup, even though they are not in the list above.
 * Keep a stricter generic shape so prose such as "2 < 3" is not mistaken for
 * HTML. */
const HTML_LIKE_PATTERN = /<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?\/?>/i;
const HTML_COMMENT_PATTERN = /<!--/i;

/* Entities are recognised separately because a stored description can have no
 * markup at all and still need one (or more) entity layers decoded. */
const ENTITY_PATTERN = /&(?:#\d{1,8}|#x[0-9a-f]{1,8}|[a-z][a-z0-9]{1,31});/i;

/* Elements whose contents should never become description text. */
const SKIP_TAGS = new Set([
  'audio', 'canvas', 'embed', 'form', 'head', 'iframe', 'input', 'map',
  'math', 'object', 'picture', 'script', 'select', 'source', 'style',
  'svg', 'template', 'textarea', 'track', 'video'
]);

/* Elements that separate blocks in the emitted Markdown. */
const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'center', 'dd', 'details',
  'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav',
  'ol', 'p', 'pre', 'section', 'summary', 'table', 'ul'
]);

/* A hard line break that survives Markdown processing without relying on
 * trailing spaces, which are easy to trim accidentally. */
const HARD_BREAK = '\\\n';


/******************************************************************************/


/* Decode HTML entities in a bounded way.
 *
 * One pass is the normal case. BGG has also been observed double-encoding the
 * XML payload, so a value can arrive as &amp;eacute; and need a second pass to
 * become é. The bound prevents a malformed or intentionally literal entity from
 * turning into an unbounded decode loop. Unknown names are left alone and are
 * escaped by the Markdown emitter. */
export function decodeDescriptionEntities(value) {
  let current = String(value ?? '');

  for (let pass = 0; pass < 3; pass += 1) {
    const decoded = decodeHTML(current);
    if (decoded === current) {
      break;
    }
    current = decoded;
  }

  return current;
}


/******************************************************************************/


/* Return the named/numeric entity tokens in a value. This is used by the
 * migration audit; an unknown token is reported rather than silently lost. */
export function descriptionEntityTokens(value) {
  return String(value ?? '').match(/&(?:#\d{1,8}|#x[0-9a-f]{1,8}|[a-z][a-z0-9]{1,31});/gi) ?? [];
}


/******************************************************************************/


/* Whether a stored description needs conversion during the migration.
 * Entity-only values are candidates because leaving them unresolved makes the
 * rendered text wrong. Plain prose is normally valid Markdown already, but
 * indented plain text (four spaces or a tab) would otherwise become a code
 * block when the page starts rendering descriptions as Markdown. */
export function isDescriptionConversionCandidate(value) {
  const text = String(value ?? '');
  return text.trim() !== '' && (
    HTML_TAG_PATTERN.test(text) ||
    HTML_LIKE_PATTERN.test(text) ||
    HTML_COMMENT_PATTERN.test(text) ||
    ENTITY_PATTERN.test(text) ||
    /^(?: {4,}|\t)\S/m.test(text)
  );
}


/******************************************************************************/


/* Collapse whitespace in normal HTML text. Preformatted content bypasses this
 * through renderPreformatted(). */
function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\t\r\n\f ]+/g, ' ');
}


/******************************************************************************/


/* Escape literal prose so that text from BGG cannot turn into unintended
 * Markdown. This intentionally escapes more than the bare minimum for prose;
 * the result is still natural when rendered, and it protects stars, brackets,
 * pipes and HTML-looking text in game names and rules summaries. */
function escapeMarkdownText(value) {
  let text = String(value ?? '');

  // Backslashes must be protected before adding any escape sequences.
  text = text.replace(/\\/g, '\\\\');

  // Inline Markdown punctuation.
  text = text
    .replace(/`/g, '\\`')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/~/g, '\\~')
    .replace(/\|/g, '\\|');

  // A less-than sign is only risky when it looks like the start of HTML.
  text = text.replace(/<(?=[A-Za-z/!?])/g, '\\<');

  // Leave unknown entities visible as text instead of letting the renderer
  // interpret them as an entity it happens to know.
  text = text.replace(/&(?=#?[A-Za-z0-9]+;)/g, '\\&');

  // Block markers only matter at the start of a line. Escaping them in prose
  // prevents a line of a description from becoming a list, heading or quote.
  text = text.replace(/^([ \t]*)([#>+-])(?=[ \t]|$)/gm, '$1\\$2');
  text = text.replace(/^([ \t]*)(\d+)([.)])(?=[ \t])/gm, '$1$2\\$3');

  return text;
}


/******************************************************************************/


/* Remove excess blank lines and edge whitespace without destroying hard breaks.
 * Hard breaks use a backslash-newline, so trimming line-end spaces is safe and
 * makes the stored values easier to inspect. */
function cleanupFragment(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}


/******************************************************************************/


/* Wrap a fragment as a block, ending it with a blank line; empty fragments
 * stay empty. */
function asBlock(value) {
  const text = cleanupFragment(value);
  return text === '' ? '' : `${text}\n\n`;
}


/******************************************************************************/


/* The selected HTML parser treats a valueless unknown tag such as <world> as
 * disposable markup. Since that shape is also plausible literal prose (and
 * losing the only word in a description is worse than showing a harmless angle
 * bracket), protect unknown unpaired tags as text before parsing. Paired
 * unknown tags still go through the unwrap path. */
function protectUnknownValuelessTags(input) {
  return String(input).replace(/<([a-z][a-z0-9-]*)(?:\s[^<>]*)?\/?>/gi, (tag, name) => {
    const lower = name.toLowerCase();
    if (HTML_TAGS.includes(lower)) {
      return tag;
    }

    const closing = new RegExp(`<\\/${lower}\\s*>`, 'i');
    if (closing.test(input)) {
      return tag;
    }

    return tag.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });
}


/******************************************************************************/


/* Whether a parsed node is an element, optionally restricted to a specific tag
 * name. */
function isElement(node, name = undefined) {
  if (node === null || node === undefined || node.nodeType !== 1) {
    return false;
  }

  if (name === undefined) {
    return true;
  }

  return String(node.rawTagName ?? '').toLowerCase() === name;
}


/******************************************************************************/


/* Return the lower-case tag name of a parsed element. */
function tagName(node) {
  return String(node?.rawTagName ?? '').toLowerCase();
}


/******************************************************************************/


/* Whether a parsed node is a text node. */
function isText(node) {
  return node?.nodeType === 3;
}


/******************************************************************************/


/* Return the raw text carried by a parsed text node. */
function elementText(node) {
  return node?.rawText ?? node?.textContent ?? '';
}


/******************************************************************************/


/* Return the text of a preformatted element, including nested markup's text,
 * with entities decoded once. Whitespace and backticks remain untouched here;
 * renderPreformatted() chooses a fence that cannot collide with the content. */
function rawTextContent(node) {
  if (isText(node)) {
    return decodeDescriptionEntities(node.rawText ?? node.textContent ?? '');
  }

  const tag = tagName(node);
  if (SKIP_TAGS.has(tag)) {
    return '';
  }

  return (node.childNodes ?? []).map(rawTextContent).join('');
}


/******************************************************************************/


/* Render a preformatted block as a fenced code block, choosing a fence that
 * cannot collide with backticks in the content. */
function renderPreformatted(node) {
  let raw = rawTextContent(node).replace(/\r\n?/g, '\n');

  // The HTML parser treats the contents of <pre> as raw text. When BGG wraps
  // code in <code>, that wrapper survives as literal text unless it is peeled
  // off here. The wrapper is also where the language class usually lives.
  const codeWrapper = raw.match(/^\s*<code\b([^>]*)>/i);
  let classValue = String(node.getAttribute?.('class') ?? '');
  if (codeWrapper !== null) {
    raw = raw.slice(codeWrapper[0].length).replace(/<\/code>\s*$/i, '');
    const wrapperClass = codeWrapper[1].match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    classValue += ` ${wrapperClass?.[1] ?? wrapperClass?.[2] ?? wrapperClass?.[3] ?? ''}`;
  }

  const text = raw.replace(/^\n/, '').replace(/\n$/, '');

  if (text.trim() === '') {
    return '';
  }

  const language = (classValue.match(/(?:^|\s)(?:language-|lang-)([a-z0-9_+-]+)/i) ?? [])[1];
  const runs = text.match(/`+/g) ?? [];
  const longestRun = runs.reduce((max, run) => Math.max(max, run.length), 0);
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  const info = language ? language.toLowerCase() : '';

  return `${fence}${info}\n${text}\n${fence}\n\n`;
}


/******************************************************************************/


/* Render inline code with a fence longer than any backtick run in the text. */
function renderInlineCode(value) {
  const text = normalizeText(value).trim();
  if (text === '') {
    return '';
  }

  const runs = text.match(/`+/g) ?? [];
  const longestRun = runs.reduce((max, run) => Math.max(max, run.length), 0);
  const fence = '`'.repeat(Math.max(1, longestRun + 1));
  return `${fence}${text}${fence}`;
}


/******************************************************************************/


/* Resolve an href to something safe and useful outside BGG. The stored link is
 * eventually rendered by the same sanitizer as a session report, but rejecting
 * dangerous schemes here keeps the Markdown itself clean as well. */
function normalizeHref(value) {
  let href = decodeDescriptionEntities(value).trim();
  if (href === '') {
    return null;
  }

  const schemeMatch = href.match(/^([a-z][a-z0-9+.-]*):/i);
  const scheme = schemeMatch?.[1].toLowerCase();

  if (scheme !== undefined && !['http', 'https', 'mailto'].includes(scheme)) {
    return null;
  }

  if (href.startsWith('//')) {
    href = `https:${href}`;
  } else if (href.startsWith('#')) {
    return href;
  } else if (href.startsWith('/')) {
    href = `https://boardgamegeek.com${href}`;
  } else if (scheme === undefined) {
    href = href.startsWith('www.')
      ? `https://${href}`
      : `https://boardgamegeek.com/${href.replace(/^\.?\//, '')}`;
  }

  return href.replace(/\s/g, '%20');
}


/******************************************************************************/


/* Render a link when the destination is safe; otherwise return just the label
 * text. */
function formatLink(label, href) {
  const text = cleanupFragment(label);
  if (text === '') {
    return '';
  }

  const target = normalizeHref(href);
  if (target === null) {
    return text;
  }

  // Parentheses in a Markdown destination need angle brackets; encode the
  // delimiters so the resulting link remains one unambiguous token.
  const destination = /[()<>]/.test(target)
    ? `<${target.replace(/</g, '%3C').replace(/>/g, '%3E')}>`
    : target;

  return `[${text}](${destination})`;
}


/******************************************************************************/


/* Render an image node; the current policy is to drop images entirely. */
function renderImageAlt(node) {
  const alt = normalizeText(node.getAttribute?.('alt') ?? '').trim();
  if (alt === '') {
    return '';
  }

  // Images cannot render through MarkdownContent. Drop them rather than
  // promoting alt text (which is often just "cover" or "thumbnail") into the
  // description body.
  return '';
}


/******************************************************************************/


/* Render a list of child nodes in inline mode and join their output. */
function renderInlineChildren(nodes, options = {}) {
  return (nodes ?? []).map(node => renderNode(node, { ...options, inline: true })).join('');
}


/******************************************************************************/


/* Render child nodes in order, collapsing runs of <br> into either one hard
 * break or one paragraph break. */
function renderChildren(nodes, options = {}) {
  let output = '';
  let index = 0;
  const list = nodes ?? [];

  while (index < list.length) {
    const node = list[index];

    if (isElement(node, 'br')) {
      // Consume the whole run of breaks, including whitespace text between
      // them, so two breaks always mean one paragraph boundary.
      let breaks = 0;
      let next = index;
      while (next < list.length) {
        if (isElement(list[next], 'br')) {
          breaks += 1;
          next += 1;
        } else if (isText(list[next]) && elementText(list[next]).trim() === '') {
          next += 1;
        } else {
          break;
        }
      }

      output += (breaks > 1) ? '\n\n' : HARD_BREAK;
      index = next;
      continue;
    }

    output += renderNode(node, options);
    index += 1;
  }

  return output;
}


/******************************************************************************/


/* Render an ordered or unordered list, including nested lists, with the
 * indentation that Markdown expects. */
function renderList(node, depth = 0) {
  const ordered = tagName(node) === 'ol';
  const start = Number.parseInt(node.getAttribute?.('start') ?? '1', 10);
  const first = Number.isNaN(start) ? 1 : start;
  const items = (node.childNodes ?? []).filter(child => isElement(child, 'li'));

  if (items.length === 0) {
    return asBlock(renderChildren(node.childNodes, { inline: false }));
  }

  const pad = '  '.repeat(depth);
  const lines = [];

  items.forEach((item, itemIndex) => {
    let content = '';
    const nested = [];

    for (const child of item.childNodes ?? []) {
      if (isElement(child, 'ul') || isElement(child, 'ol')) {
        nested.push(child);
      } else if (isElement(child, 'p') || isElement(child, 'div')) {
        content += renderChildren(child.childNodes ?? [], { inline: true });
      } else {
        content += renderNode(child, { inline: true });
      }
    }

    const textLines = cleanupFragment(content).split('\n');
    const marker = ordered ? `${first + itemIndex}. ` : '- ';
    const continuation = ' '.repeat(marker.length);

    if (textLines.length === 0 || (textLines.length === 1 && textLines[0] === '')) {
      lines.push(`${pad}${marker}`.trimEnd());
    } else {
      lines.push(`${pad}${marker}${textLines[0]}`);
      textLines.slice(1).forEach(line => lines.push(`${pad}${continuation}${line}`));
    }

    nested.forEach(child => lines.push(renderList(child, depth + 1).trimEnd()));
  });

  return `${lines.join('\n')}\n\n`;
}


/******************************************************************************/


/* Render a blockquote, prefixing every line and preserving blank lines. */
function renderBlockquote(node) {
  const text = cleanupFragment(renderChildren(node.childNodes, { inline: false }));
  if (text === '') {
    return '';
  }

  const quoted = text.split('\n').map(line => line === '' ? '>' : `> ${line}`).join('\n');
  return `${quoted}\n\n`;
}


/******************************************************************************/


/* Render the rows of an HTML table as a GitHub-flavored Markdown table. */
function renderTable(node) {
  const rows = [];

  // Walk the table sections and collect their row elements in document order.
  function collect(current) {
    for (const child of current.childNodes ?? []) {
      const tag = tagName(child);
      if (tag === 'tr') {
        rows.push(child);
      } else if (tag === 'thead' || tag === 'tbody' || tag === 'tfoot') {
        collect(child);
      }
    }
  }

  collect(node);

  if (rows.length === 0) {
    return asBlock(renderChildren(node.childNodes, { inline: false }));
  }

  const renderedRows = rows.map(row => {
    const cells = (row.childNodes ?? []).filter(child => isElement(child, 'td') || isElement(child, 'th'));
    return cells.map(cell => cleanupFragment(renderInlineChildren(cell.childNodes, { inTable: true }))
      .replace(/\n+/g, ' ')
      .trim());
  }).filter(row => row.length > 0);

  if (renderedRows.length === 0) {
    return '';
  }

  const width = Math.max(...renderedRows.map(row => row.length));
  const normalized = renderedRows.map(row => [
    ...row,
    ...Array.from({ length: width - row.length }, () => '')
  ]);

  // Format one row of the emitted Markdown table.
  const formatRow = row => `| ${row.join(' | ')} |`;
  const header = normalized[0];
  const divider = Array.from({ length: width }, () => '---');
  const lines = [formatRow(header), formatRow(divider), ...normalized.slice(1).map(formatRow)];

  return `${lines.join('\n')}\n\n`;
}


/******************************************************************************/


/* Render one parsed node according to its tag, falling back to unwrapped text
 * for tags that have no explicit Markdown form. */
function renderNode(node, options = {}) {
  if (node === null || node === undefined) {
    return '';
  }

  if (isText(node)) {
    const raw = decodeDescriptionEntities(elementText(node));
    const text = options.preserveWhitespace ? raw : normalizeText(raw);
    return escapeMarkdownText(text);
  }

  if (node.nodeType === 8) { // comment
    return '';
  }

  if (!isElement(node)) {
    return '';
  }

  const tag = tagName(node);

  if (SKIP_TAGS.has(tag)) {
    return '';
  }

  if (tag === 'br') {
    return HARD_BREAK;
  }

  if (tag === 'hr') {
    return '---\n\n';
  }

  if (/^h[1-6]$/.test(tag)) {
    const content = cleanupFragment(renderInlineChildren(node.childNodes, options));
    if (content === '') {
      return '';
    }

    const level = Math.min(3, Number.parseInt(tag[1], 10));
    return `${'#'.repeat(level)} ${content}\n\n`;
  }

  if (tag === 'p') {
    return asBlock(renderChildren(node.childNodes, { ...options, inline: true }));
  }

  if (tag === 'pre') {
    return renderPreformatted(node);
  }

  if (tag === 'code') {
    return renderInlineCode(rawTextContent(node));
  }

  if (tag === 'blockquote') {
    return renderBlockquote(node);
  }

  if (tag === 'ul' || tag === 'ol') {
    return renderList(node, 0);
  }

  if (tag === 'li') {
    return asBlock(renderChildren(node.childNodes, { ...options, inline: true }));
  }

  if (tag === 'table') {
    return renderTable(node);
  }

  if (tag === 'a') {
    const label = renderInlineChildren(node.childNodes, options);
    return formatLink(label, node.getAttribute?.('href') ?? '');
  }

  if (tag === 'img') {
    return renderImageAlt(node);
  }

  if (tag === 'strong' || tag === 'b') {
    const content = renderInlineChildren(node.childNodes, options);
    return content.trim() === '' ? content : `**${content}**`;
  }

  if (tag === 'em' || tag === 'i') {
    const content = renderInlineChildren(node.childNodes, options);
    return content.trim() === '' ? content : `*${content}*`;
  }

  if (tag === 'del' || tag === 's' || tag === 'strike') {
    const content = renderInlineChildren(node.childNodes, options);
    return content.trim() === '' ? content : `~~${content}~~`;
  }

  if (tag === 'sup' || tag === 'sub') {
    return renderInlineChildren(node.childNodes, options);
  }

  if (BLOCK_TAGS.has(tag)) {
    return asBlock(renderChildren(node.childNodes, options));
  }

  // Unknown element: unwrap its text and children instead of leaking raw HTML.
  const content = renderInlineChildren(node.childNodes, options);
  if (content !== '' || String(node.textContent ?? '').trim() !== '') {
    return content;
  }

  // A valueless unknown element can also be literal prose such as <world> or a
  // custom placeholder. Preserve it as escaped text rather than silently
  // deleting the only content in the description.
  return escapeMarkdownText(`<${tag}>`);
}


/******************************************************************************/


/* Normalize and escape a plain-text description without treating it as HTML. */
function renderPlainText(value) {
  const decoded = decodeDescriptionEntities(value).replace(/\r\n?/g, '\n');
  const lines = decoded.split('\n').map(line => escapeMarkdownText(normalizeText(line)));
  return cleanupFragment(lines.join('\n'));
}


/******************************************************************************/


/* Convert one BGG description to canonical Markdown. This is the only entry
 * point used by both imports and the migration tool. */
export function gameDescriptionToMarkdown(value) {
  const input = String(value ?? '').replace(/\r\n?/g, '\n').trim();
  if (input === '') {
    return '';
  }

  if (HTML_TAG_PATTERN.test(input) || HTML_LIKE_PATTERN.test(input) || HTML_COMMENT_PATTERN.test(input)) {
    const root = parse(protectUnknownValuelessTags(input), { comment: false });
    return cleanupFragment(renderChildren(root.childNodes, { inline: false }));
  }

  return renderPlainText(input);
}


/******************************************************************************/


/* Helpers exposed for focused unit tests; not part of the public API. */
export const __test = {
  escapeMarkdownText,
  normalizeHref,
  renderTable,
};


/******************************************************************************/
