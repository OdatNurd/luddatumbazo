<script>
  import LoadingState from '$components/LoadingState.svelte';
  import ErrorState from '$components/ErrorState.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The promise that resolves to the data to display in the zone. When this
  // changes, the zone resets to loading and awaits the new promise.
  export let source;

  // When given, load failures offer this action to run the request again.
  export let onretry = undefined;

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
    <LoadingState />
  </slot>
{:else if state.status === 'error'}
  <slot name="error" error={state.error}>
    <ErrorState error={state.error} retry={onretry} />
  </slot>
{:else}
  <slot result={state.result}></slot>
{/if}
