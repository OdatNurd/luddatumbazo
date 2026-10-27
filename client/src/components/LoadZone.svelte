<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The promise that resolves to the data to display in the zone. When this
  // changes, the zone resets to loading and awaits the new promise.
  export let source;

  // ---------------------------------------------------------------------------

  // Track the state of the promise; the zone shows the loading slot while the
  // promise is pending, the error slot when it rejects, and the default slot
  // with the resolved data otherwise.
  let state = { status: 'loading' };

  const load = async promise => {
    state = { status: 'loading' };

    try {
      state = { status: 'done', result: await promise };
    }
    catch (error) {
      state = { status: 'error', error };
    }
  };

  // Re-run whenever a new source promise is handed to us.
  $: load(source);
</script>

{#if state.status === 'loading'}
  <slot name="loading">
    <div class="loadzone-status">
      <wa-spinner></wa-spinner>
    </div>
  </slot>
{:else if state.status === 'error'}
  <slot name="error" error={state.error}>
    <div class="loadzone-status loadzone-error">{state.error}</div>
  </slot>
{:else}
  <slot result={state.result}></slot>
{/if}

<style>
  .loadzone-status {
    display: flex;
    justify-content: center;
    padding: 24px;
  }

  .loadzone-error {
    color: var(--wa-color-danger-700);
  }
</style>
