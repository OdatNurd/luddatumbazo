<script>
  import { onMount } from 'svelte';

  import { api } from '$api';
  import { user } from '$stores/user';

  import StorageLocationPicker from '$components/StorageLocationPicker.svelte';
  import LoadingState from '$components/LoadingState.svelte';

  // The games being moved and the mode the dialog is in. "assign" is used for
  // Unstored games, which become on shelf; "move" is used for games that
  // already have a location and keep their existing shelf state.
  export let gameIds = [];
  export let mode = 'move';
  export let consumer = 'storage-move';

  // Invoked with { result } on success, or { result: null } when cancelled.
  export let onclose = undefined;

  let locations = [];
  let loading = true;
  let saving = false;
  let warning = null;
  let selectedLocationId = null;

  let settled = false;

  $: count = gameIds.length;
  $: plural = count === 1 ? 'game' : 'games';
  $: title = mode === 'assign' ? 'Assign storage' : 'Move games';
  $: action = mode === 'assign' ? 'Assign' : 'Move';
  $: description = mode === 'assign'
    ? `Choose where to store ${count} unstored ${plural}. They will be marked on shelf.`
    : `Choose where to move ${count} ${plural}. Their shelf state will be kept.`;

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
    selectedLocationId = null;

    if (!$user.household) {
      warning = 'You do not have a household to assign storage in.';
      loading = false;
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

  onMount(prepare);

  const abort = () => {
    if (saving === true) {
      return;
    }

    finish({ result: null });
  };

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
    if (saving === true || count === 0) {
      return;
    }

    if (selectedLocationId === null) {
      warning = 'Choose a storage location first.';
      return;
    }

    saving = true;
    warning = null;

    try {
      const result = await api.household.storage.assign(
        $user.household, gameIds, selectedLocationId
      );
      finish({ result });
    }
    catch (error) {
      warning = error.message ?? 'unable to move those games';
    }
    finally {
      saving = false;
    }
  };
</script>


<wa-dialog open label={title} style="min-width: min(560px, 94vw)"
           on:wa-hide={dismissed}>
  <h3 slot="header">{title}</h3>

  {#if warning !== null}
    <wa-callout variant="warning">{warning}</wa-callout>
  {/if}

  {#if loading}
    <LoadingState />
  {:else}
    <div class="stack">
      <p class="description">{description}</p>

      <StorageLocationPicker {locations} {consumer}
                             bind:value={selectedLocationId} />

      {#if locations.length === 0}
        <div class="muted">
          <a href="#/storage" on:click={() => abort()}>Create a storage location first</a>.
        </div>
      {/if}
    </div>
  {/if}

  <div slot="footer" class="actions">
    <!-- wa-button wraps a real <button>; the a11y warnings are false positives. -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <wa-button appearance="outlined" variant="neutral" on:click={abort}
               disabled={saving}>Cancel</wa-button>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <wa-button appearance="filled" variant="brand" on:click={save}
               loading={saving}
               disabled={saving || loading || selectedLocationId === null}>
      {action}
    </wa-button>
  </div>
</wa-dialog>


<style>
  .description {
    margin: 0;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;
  }
</style>
