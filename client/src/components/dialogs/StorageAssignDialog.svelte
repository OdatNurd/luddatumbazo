<script>
  import { api } from '$api';
  import { user } from '$stores/user';

  import StorageLocationPicker from '$components/StorageLocationPicker.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Whether the dialog is presented.
  export let open = false;

  // The game slug being assigned.
  export let game = '';

  // The current owned-game record, including storage and isOnShelf.
  export let current = null;

  // Invoked with { result } where result is the updated owned-game record, or
  // { result: null } when cancelled.
  export let onclose = undefined;

  // ---------------------------------------------------------------------------

  let locations = [];
  let loading = false;
  let saving = false;
  let warning = null;

  // The selected location; null is the virtual Unstored option.
  let selected = null;
  let onShelf = false;

  // Ensure a close is reported only once even if the dialog emits hide while
  // the parent is already closing it.
  let settled = false;
  let wasOpen = false;

  const finish = detail => {
    if (settled === false) {
      settled = true;
      onclose?.(detail);
    }
  };

  const prepare = async () => {
    settled = false;
    saving = false;
    warning = null;
    locations = [];

    selected = (current?.storage?.id === undefined || current?.storage?.id === null)
      ? null
      : Number(current.storage.id);
    onShelf = current?.isOnShelf === true;

    if (!$user.household) {
      warning = 'You do not have a household to assign storage in.';
      return;
    }

    loading = true;

    try {
      const data = await api.household.storage.list($user.household);
      locations = data.locations ?? [];
    }
    catch (error) {
      warning = error.message ?? 'unable to load storage locations';
    }
    finally {
      loading = false;
    }
  };

  // Load when the dialog transitions from closed to open, and reset the guard
  // when it closes so the next opening starts fresh.
  $: if (open === true && wasOpen === false) {
    wasOpen = true;
    prepare();
  }

  $: if (open === false) {
    wasOpen = false;
  }

  const locationChanged = event => {
    const hadLocation = selected !== null;
    selected = event.detail?.value ?? null;

    if (selected === null) {
      onShelf = false;
    }
    else if (hadLocation === false) {
      // Moving an Unstored game into a location puts it on the shelf by
      // default; changing an existing location preserves its off-shelf state.
      onShelf = true;
    }
  };

  const setOnShelf = event => onShelf = event.target.checked;

  const abort = () => {
    if (saving === true) {
      return;
    }

    finish({ result: null });
  };

  // Close only for events from the dialog itself; selects and switches bubble
  // their own hide events.
  const dismissed = event => {
    if (event.target === event.currentTarget) {
      if (saving === true) {
        event.preventDefault();
        return;
      }

      abort();
    }
  };

  const save = async () => {
    if (saving === true) {
      return;
    }

    if (selected === null && onShelf === true) {
      warning = 'An unstored game cannot be marked as on shelf.';
      return;
    }

    saving = true;
    warning = null;

    try {
      const storageLocationId = selected;
      const result = await api.household.collection.storage(
        $user.household, game, storageLocationId, selected === null ? false : onShelf
      );

      finish({ result });
    }
    catch (error) {
      warning = error.message ?? 'unable to update storage';
    }
    finally {
      saving = false;
    }
  };
</script>


<wa-dialog {open} label="Storage" style="min-width: min(560px, 94vw)"
           on:wa-hide={dismissed}>
  <h3 slot="header">Storage</h3>

  {#if warning !== null}
    <wa-callout variant="warning">{warning}</wa-callout>
  {/if}

  {#if loading}
    <div class="loading"><wa-spinner></wa-spinner></div>
  {:else}
    <div class="stack">
      <StorageLocationPicker {locations} value={selected}
                             consumer="game-storage" allowUnstored
                             on:change={locationChanged} />

      {#if locations.length === 0}
        <div class="muted">
          <a href="#/storage" on:click={() => abort()}>Create a storage location first</a>.
        </div>
      {/if}

      <wa-switch checked={onShelf} disabled={selected === null}
                 on:change={setOnShelf}>
        {onShelf ? 'On shelf' : 'Off shelf'}
      </wa-switch>

      <div class="muted hint">
        Marking a game off shelf keeps its location, so it is easy to put back later.
      </div>
    </div>
  {/if}

  <div slot="footer" class="actions">
    <!-- wa-button wraps a real <button>; the a11y warnings are false positives. -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <wa-button appearance="outlined" variant="neutral" on:click={abort}
               disabled={saving}>Cancel</wa-button>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <wa-button appearance="filled" variant="brand" on:click={save}
               loading={saving} disabled={saving || loading}>Apply</wa-button>
  </div>
</wa-dialog>


<style>
  .loading {
    display: flex;
    justify-content: center;
    padding: 24px;
  }

  .hint {
    font-size: var(--wa-font-size-s);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;
  }
</style>
