/******************************************************************************/


/* The rich text editor is large and is only needed when someone opens the
 * Details tab of a session report. Keep its module in its own chunk and load it
 * on demand; a failed attempt is not cached so the user can retry. */
let editorImport = null;

export function loadRichTextEditor() {
  if (editorImport === null) {
    editorImport = import('@awesome.me/webawesome-pro/dist/components/rich-text-editor/rich-text-editor.js')
      .catch(error => {
        editorImport = null;
        throw error;
      });
  }

  return editorImport;
}


/******************************************************************************/


/* The editor styles its content inside its own shadow root. Its built-in
 * content rules deliberately have zero specificity so a consumer can adopt a
 * stylesheet that brings the editable rendering in line with the saved page.
 *
 * These sizes match MarkdownContent so the report does not visually jump
 * when editing stops. The blockquote and rule use louder borders than the
 * editor default, whose near-black border is effectively invisible on the
 * dark theme. */
const CONTENT_STYLES = `
  #content h1 { font-size: 1.5em; }
  #content h2 { font-size: 1.35em; }
  #content h3 { font-size: 1.2em; }
  #content h4 { font-size: 1.1em; }
  #content h5 { font-size: 1em; }
  #content h6 { font-size: 0.9em; }

  #content h1,
  #content h2,
  #content h3,
  #content h4,
  #content h5,
  #content h6 {
    margin-block-start: 1em;
    margin-block-end: 0.5em;
  }

  #content blockquote {
    margin-block: 0 1em;
    padding: var(--wa-space-xl) var(--wa-space-xl) var(--wa-space-xl) 1em;
    border-inline-start: 3px solid var(--wa-color-neutral-border-loud);
    color: var(--wa-color-text-quiet);
    font-family: var(--wa-font-family-longform);
    font-size: 1.25em;
  }

  #content blockquote > :last-child {
    margin-block-end: 0;
  }

  #content hr {
    margin-block: 1.25em;
    border: none;
    border-block-end: 1px solid var(--wa-color-neutral-border-loud);
  }
`;

let contentStyles = null;


/******************************************************************************/


/* Adopt the content stylesheet into the editor's shadow root. The same sheet
 * can be shared by every editor instance in the page. */
export function applyRichTextEditorStyles(editor) {
  const root = editor?.shadowRoot;

  if (root === null || root === undefined || typeof CSSStyleSheet === 'undefined') {
    return;
  }

  if (contentStyles === null) {
    contentStyles = new CSSStyleSheet();
    contentStyles.replaceSync(CONTENT_STYLES);
  }

  if (root.adoptedStyleSheets.includes(contentStyles) === false) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, contentStyles];
  }
}


/******************************************************************************/
