<script>
  import { renderMarkdown } from '$lib/markdown.js';

  // The Markdown source to render. The preview uses the same component as the
  // saved session page, so both show identical formatting and sanitization.
  export let content = '';

  // Optional message shown when there is no content; when omitted, empty
  // content renders nothing.
  export let empty = null;

  $: text = String(content ?? '');
  $: isEmpty = text.trim() === '';

  // Only parse while there is something to show. The renderer sanitizes the
  // generated HTML before it is inserted here.
  $: html = isEmpty ? '' : renderMarkdown(text);
</script>

{#if isEmpty}
  {#if empty !== null}
    <div class="empty muted">{empty}</div>
  {/if}
{:else}
  <div class="markdown-body">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html html}
  </div>
{/if}

<style>
  .markdown-body {
    min-width: 0;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  /* The rendered Markdown is inserted as raw HTML, so its elements do not get
     Svelte's scoped class. Use :global() for the elements inside the body. */
  .markdown-body :global(:first-child) {
    margin-top: 0;
  }

  .markdown-body :global(:last-child) {
    margin-bottom: 0;
  }

  .markdown-body :global(p) {
    margin: 0 0 1em;
  }

  .markdown-body :global(h1),
  .markdown-body :global(h2),
  .markdown-body :global(h3),
  .markdown-body :global(h4),
  .markdown-body :global(h5),
  .markdown-body :global(h6) {
    margin: 1em 0 0.5em;
  }

  .markdown-body :global(h1) { font-size: 1.5em; }
  .markdown-body :global(h2) { font-size: 1.35em; }
  .markdown-body :global(h3) { font-size: 1.2em; }
  .markdown-body :global(h4) { font-size: 1.1em; }
  .markdown-body :global(h5) { font-size: 1em; }
  .markdown-body :global(h6) { font-size: 0.9em; }

  .markdown-body :global(ul),
  .markdown-body :global(ol) {
    margin: 0 0 1em;
    padding-left: 1.75em;
  }

  .markdown-body :global(li + li) {
    margin-top: 0.25em;
  }

  .markdown-body :global(blockquote) {
    margin: 0 0 1em;
    padding-left: 1em;
    border-left: 3px solid var(--wa-color-surface-border);
    color: var(--wa-color-text-quiet);
  }

  .markdown-body :global(code) {
    padding: 0.1em 0.3em;
    border-radius: var(--wa-border-radius-s);
    background: var(--wa-color-surface-lowered);
    font-family: var(--wa-font-family-code, monospace);
    font-size: 0.9em;
  }

  .markdown-body :global(pre) {
    margin: 0 0 1em;
    padding: 12px;
    border-radius: var(--wa-border-radius-s);
    background: var(--wa-color-surface-lowered);
    overflow-x: auto;
  }

  .markdown-body :global(pre code) {
    padding: 0;
    background: transparent;
  }

  .markdown-body :global(hr) {
    margin: 1.25em 0;
    border: 0;
    border-top: 1px solid var(--wa-color-surface-border);
  }

  .markdown-body :global(table) {
    margin: 0 0 1em;
    border-collapse: collapse;
  }

  .markdown-body :global(th),
  .markdown-body :global(td) {
    padding: 6px 10px;
    border: 1px solid var(--wa-color-surface-border);
    text-align: left;
  }

  .markdown-body :global(th) {
    background: var(--wa-color-surface-lowered);
  }
</style>
