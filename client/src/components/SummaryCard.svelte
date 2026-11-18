<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  export let label = '';
  export let value = '';
  export let note = undefined;
  export let href = undefined;
  export let title = undefined;
  export let active = false;

  // ---------------------------------------------------------------------------
</script>


{#if href !== undefined && href !== null}
  <a class="summary-card summary-link" class:active
     {href} {title} aria-current={active ? 'page' : undefined}>
    <span class="summary-label">{label}</span>
    <strong>{value}</strong>
    {#if note !== undefined && note !== null}
      <span class="summary-note">{note}</span>
    {/if}
  </a>
{:else}
  <div class="summary-card" {title}>
    <span class="summary-label">{label}</span>
    <strong>{value}</strong>
    {#if note !== undefined && note !== null}
      <span class="summary-note">{note}</span>
    {/if}
  </div>
{/if}


<style>
  .summary-card {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    padding: var(--app-card-padding);
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-lowered);
    color: inherit;
    text-decoration: none;
  }

  .summary-label {
    color: var(--wa-color-text-quiet);
    font-size: var(--app-card-label-size);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .summary-card strong {
    font-size: var(--app-card-value-size);
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .summary-note {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  .summary-link:hover,
  .summary-link:focus-visible,
  .summary-link.active {
    border-color: var(--wa-color-brand-border-loud);
  }

  .summary-link:focus-visible {
    outline: 2px solid var(--wa-color-brand-border-loud);
    outline-offset: 2px;
  }
</style>
