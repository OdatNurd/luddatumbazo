<script>
  // The trail below Storage itself. The final item is the current page and is
  // rendered as plain text; all preceding items link back up the tree.
  export let trail = [];

  // An optional return link for pages that can be opened from outside the
  // storage tree (the collection's queue cards, for example). It is rendered
  // beside the breadcrumb rather than inside it, so the hierarchy still reads
  // as Storage > current page.
  export let origin = undefined;

  $: items = [{ label: 'Storage', href: '#/storage' }, ...trail];
</script>


<nav class="breadcrumb" aria-label="Breadcrumb">
  {#if origin !== undefined && origin !== null}
    <a class="origin" href={origin.href}>&larr; {origin.label}</a>
  {/if}

  <ol>
    {#each items as item, index (index)}
      <li>
        {#if index > 0}
          <span class="separator" aria-hidden="true">/</span>
        {/if}

        {#if item.href}
          <a href={item.href}>{item.label}</a>
        {:else}
          <span class="current" aria-current="page">{item.label}</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>


<style>
  .breadcrumb {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 10px;
    min-width: 0;
  }

  .origin {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    white-space: nowrap;
  }

  ol {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }

  a,
  .separator {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    text-decoration: none;
  }

  a:hover,
  a:focus-visible {
    color: var(--wa-color-text-normal);
    text-decoration: underline;
  }

  .separator {
    user-select: none;
  }

  .current {
    color: var(--wa-color-text-normal);
    font-family: var(--wa-font-family-heading);
    font-size: var(--wa-font-size-l);
    font-weight: var(--wa-font-weight-semibold);
    overflow-wrap: anywhere;
  }
</style>
