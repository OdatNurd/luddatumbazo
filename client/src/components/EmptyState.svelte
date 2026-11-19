<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The headline explains what is missing; the description gives the next step
  // or the reason. Both are plain text so pages do not have to rebuild the
  // presentation just to explain a different empty case.
  export let title = '';
  export let description = undefined;

  // ---------------------------------------------------------------------------
</script>


<div class="empty-state">
  <p class="empty-title">{title}</p>

  {#if description !== undefined && description !== null && description !== ''}
    <p class="empty-description">{description}</p>
  {/if}

  {#if $$slots.action}
    <div class="empty-action">
      <slot name="action" />
    </div>
  {/if}
</div>


<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: var(--app-panel-body-padding);
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-lowered);
    text-align: center;
  }

  .empty-title {
    margin: 0;
    font-weight: var(--wa-font-weight-semibold);
  }

  .empty-description {
    max-width: 60ch;
    margin: 0;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .empty-action {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
</style>
