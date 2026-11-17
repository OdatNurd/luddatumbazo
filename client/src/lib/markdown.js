/******************************************************************************/


import { marked } from 'marked';
import DOMPurify from 'dompurify';


/******************************************************************************/


/* Session write-ups are authored as Markdown but are still untrusted content: a
 * report can be edited by any participant while it is open. Render the
 * Markdown, then sanitize the generated HTML before it reaches {@html}.
 *
 * Only the formatting the reports actually need is allowed. Images and raw
 * styling are deliberately excluded: links are enough for references to games,
 * sessions and outside resources, and keeping the allowed surface small avoids
 * turning a report into a place to inject remote content.
 *
 * `target` and `rel` are allowed so that the hook below can normalize links;
 * user-supplied values for them are overwritten there. */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
  'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

const ALLOWED_ATTRS = ['href', 'title', 'target', 'rel'];

const MARKDOWN_OPTIONS = {
  gfm: true,
  breaks: true
};

/* External links open in a new tab and cannot reach back through
 * `window.opener`; internal hash links stay in the current tab. */
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName !== 'A') {
    return;
  }

  const href = node.getAttribute('href') ?? '';

  if (/^(https?:)?\/\//i.test(href)) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
  else {
    node.removeAttribute('target');
    node.removeAttribute('rel');
  }
});


/******************************************************************************/


/* Render a session report body as sanitized HTML. Blank content produces an
 * empty string rather than an empty paragraph. */
export function renderMarkdown(source) {
  const text = String(source ?? '');

  if (text.trim() === '') {
    return '';
  }

  const html = marked.parse(text, MARKDOWN_OPTIONS);

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRS,
    ALLOW_DATA_ATTR: false
  });
}


/******************************************************************************/
