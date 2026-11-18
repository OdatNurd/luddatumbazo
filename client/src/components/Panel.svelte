<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  export let title = '';
  export let note = undefined;

  // A flush body has no padding; use it when the body is a DataGrid that
  // already supplies its own toolbar and row chrome.
  export let flush = false;

  // The storage tree hides its hint on phones to leave more room for the list.
  export let hideNoteOnNarrow = false;

  // ---------------------------------------------------------------------------
</script>


<div class="panel">
  <div class="panel-head" class:hide-note-on-narrow={hideNoteOnNarrow}>
    <h4>{title}</h4>

    {#if note !== undefined && note !== null && note !== ''}
      <span class="panel-note">{note}</span>
    {/if}

    {#if $$slots.actions}
      <div class="panel-actions">
        <slot name="actions" />
      </div>
    {/if}
  </div>

  <div class="panel-body" class:flush>
    <slot />
  </div>
</div>


<style>
  .panel {
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-default);
    overflow: hidden;
  }

  .panel-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: var(--app-panel-head-padding);
    border-bottom: 1px solid var(--wa-color-surface-border);
    background: var(--wa-color-surface-lowered);
  }

  .panel-head h4 {
    margin: 0;
    font-size: var(--app-section-title-size);
  }

  .panel-note {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  .panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .panel-body {
    padding: var(--app-panel-body-padding);
  }

  .panel-body.flush {
    padding: 0;
  }

  @media (max-width: 640px) {
    .panel-head.hide-note-on-narrow .panel-note {
      display: none;
    }
  }
</style>
