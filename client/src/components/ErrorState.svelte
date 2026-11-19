<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The failure to present. Reading the message avoids the "Error: ..." prefix
  // that stringifying the object itself would add.
  export let error = undefined;

  // When given, a button that re-runs the failed request is shown.
  export let retry = undefined;
  export let retryLabel = 'Retry';

  $: message = error?.message ?? String(error ?? 'Something went wrong.');
</script>


<wa-callout variant="danger">
  <div class="error-state">
    <span class="error-state-message">{message}</span>

    <div class="error-state-actions">
      <!-- Extra actions, such as a link back to a safe page. -->
      <slot name="actions" />

      {#if retry !== undefined}
        <!-- wa-button wraps a real <button>; the a11y warnings are false positives. -->
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button size="s" appearance="outlined" variant="neutral" on:click={retry}>
          {retryLabel}
        </wa-button>
      {/if}
    </div>
  </div>
</wa-callout>


<style>
  .error-state {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .error-state-message {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .error-state-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-inline-start: auto;
  }
</style>
