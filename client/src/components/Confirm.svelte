<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The prompt presented to the user.
  let params = {
    title: 'Are you sure?',
    message: '',
    confirmLabel: 'Confirm',
    confirmVariant: 'danger'
  };

  // The current visibility of the dialog.
  let open = false;

  // The resolver for the in-flight confirmation, if any.
  let resolve = null;

  // ---------------------------------------------------------------------------

  // Ask for confirmation; resolves to true when confirmed, false otherwise. The
  // dialog can also be dismissed with escape or an overlay click, which
  // resolves as a cancellation.
  export function show({
    title = 'Are you sure?',
    message = '',
    confirmLabel = 'Confirm',
    confirmVariant = 'danger'
  } = {}) {
    params = { title, message, confirmLabel, confirmVariant };
    open = true;

    return new Promise(done => resolve = done);
  }

  // Finish the prompt with the given result and close the dialog.
  const finish = result => {
    open = false;

    if (resolve !== null) {
      const done = resolve;
      resolve = null;
      done(result);
    }
  };

  // When the underlying dialog hides on its own (escape, overlay click),
  // resolve any outstanding prompt as a cancellation.
  const hidden = () => finish(false);
</script>

<!-- The dialog lives only while the prompt is open. Web Awesome keeps an open
     dialog alive while it animates closed, so toggling its own open property
     from a Svelte binding can race with that animation. Removing the element
     when the prompt finishes closes the dialog without that loop. -->
{#if open}
  <wa-dialog open label={params.title} style="max-width: 420px" on:wa-hide={hidden}>
    <h3 slot="header">{params.title}</h3>

    <p>{params.message}</p>

    <div slot="footer" class="confirm-actions">
      <!-- wa-button renders a real <button> in its shadow DOM, so it is
           keyboard accessible and interactive; the compiler cannot know that. -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="outlined" on:click={() => finish(false)}>Cancel</wa-button>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button variant={params.confirmVariant} appearance="filled"
                 on:click={() => finish(true)}>{params.confirmLabel}</wa-button>
    </div>
  </wa-dialog>
{/if}

<style>
  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;
  }

  p {
    margin: 0;
  }
</style>
