<script>
  import { onMount } from 'svelte';

  import { api } from '$api';
  import { user } from '$stores/user';

  import * as cells from '$lib/cells.js';
  import SlugList from '$components/lists/SlugList.svelte';
  import PageHead from '$components/PageHead.svelte';
  import EmptyState from '$components/EmptyState.svelte';
  import LoadingState from '$components/LoadingState.svelte';
  import ErrorState from '$components/ErrorState.svelte';
  import StorageBreadcrumb from '$components/StorageBreadcrumb.svelte';
  import BulkStorageAssignDialog from '$components/dialogs/BulkStorageAssignDialog.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  export let routeInfo = {};

  // ---------------------------------------------------------------------------

  // The route accepts either a numeric ID or the stored slug returned by the
  // storage list; keep the raw value so links made with either keep working.
  const storageKey = routeInfo.params?.storageId;

  // The page defaults to showing a location and everything below it. Turning
  // this off leaves just the games assigned directly to this cubby/shelf.
  let includeChildren = true;

  let locations = [];
  let location = null;
  let loadingLocation = true;
  let locationError = null;

  // The opt-in selection mode used when pulling games off the shelf. Ordinary
  // browsing keeps the grid exactly as it was; only this mode adds checkboxes.
  let selecting = false;
  let selectedKeys = [];
  let saving = false;
  let actionError = null;
  let bulkOpen = false;
  let list = null;

  // Load the full tree so the header can show the path, both counts and
  // whether the toggle has anything to do. The grid itself loads independently.
  const loadLocation = async ({ quiet = false } = {}) => {
    if (!$user.household) {
      loadingLocation = false;
      return;
    }

    if (quiet === false) {
      loadingLocation = true;
    }

    locationError = null;

    try {
      const data = await api.household.storage.list($user.household);
      locations = data.locations ?? [];
      location = locations.find(entry => entry.slug === storageKey)
        ?? locations.find(entry => String(entry.id) === storageKey)
        ?? null;

      if (location === null) {
        locationError = `Unable to locate storage location ${storageKey}.`;
      }
    }
    catch (failure) {
      locationError = failure.message ?? 'unable to load the storage location';
    }
    finally {
      if (quiet === false) {
        loadingLocation = false;
      }
    }
  };

  onMount(loadLocation);

  $: hasChildren = location !== null &&
    locations.some(entry => entry.parentId === location.id);

  // Build the breadcrumb from parent links rather than by splitting the
  // display path, since a location name is allowed to contain a slash.
  $: trail = (() => {
    if (location === null) {
      return [];
    }

    const chain = [];
    const seen = [];
    let node = location;

    while (node !== null && node !== undefined && seen.includes(node.id) === false) {
      seen.push(node.id);
      chain.unshift(node);
      node = (node.parentId === null || node.parentId === undefined)
        ? null
        : locations.find(entry => entry.id === node.parentId);
    }

    return chain.map((entry, index) => ({
      label: entry.name,
      href: (index < chain.length - 1)
        ? `#/storage/${entry.slug ?? entry.id}`
        : undefined
    }));
  })();

  const loader = async () => api.household.storage.contents(
    $user.household, storageKey, includeChildren
  );

  $: loaderKey = `${storageKey}:${includeChildren ? 'subtree' : 'direct'}`;

  const setIncludeChildren = event => {
    includeChildren = event.target.checked;
    selectedKeys = [];
  };

  const startSelecting = () => {
    selectedKeys = [];
    actionError = null;
    selecting = true;
  };

  const cancelSelecting = () => {
    selectedKeys = [];
    actionError = null;
    selecting = false;
  };

  const openMove = () => {
    if (selectedKeys.length === 0 || saving === true) {
      return;
    }

    bulkOpen = true;
  };

  const moveResult = detail => {
    bulkOpen = false;

    if (detail?.result !== null && detail?.result !== undefined) {
      selectedKeys = [];
      selecting = false;
      list?.refresh();
      loadLocation({ quiet: true });
    }
  };

  const markOffShelf = async () => {
    if (selectedKeys.length === 0 || saving === true) {
      return;
    }

    saving = true;
    actionError = null;

    try {
      await api.household.storage.shelf($user.household, selectedKeys, false);
      selectedKeys = [];
      selecting = false;
      list?.refresh();
    }
    catch (failure) {
      actionError = failure.message ?? 'unable to mark those games off shelf';
    }
    finally {
      saving = false;
    }
  };

  // The storage column is only useful when the view spans several
  // sub-locations. The API returns the path below the selected location, so
  // each row shows just the part that distinguishes it from the page heading.
  // Clicking the path opens that location and narrows the focus further.
  const storageColumn = {
    field: 'storagePath',
    label: 'Location',
    flex: 1.4,
    filterable: true,
    filterType: 'text',
    formatter: (value, row) => {
      if (!value) {
        return 'Directly here';
      }

      return cells.link(
        `#/storage/${row.storageSlug ?? row.storageLocationId}`,
        value
      );
    }
  };

  const shelfColumn = {
    field: 'isOnShelf',
    label: 'Shelf',
    width: 120,
    formatter: value => value
      ? cells.badge('On shelf', 'success')
      : cells.badge('Off shelf', 'warning')
  };

  $: extraColumns = (includeChildren && hasChildren)
    ? [storageColumn, shelfColumn]
    : [shelfColumn];

  const plural = count => count === 1 ? 'game' : 'games';
</script>


{#if !$user.household}
  <PageHead title="Storage" />
  <EmptyState title="No household yet"
              description="You need to belong to a household before you can manage storage." />
{:else if loadingLocation}
  <LoadingState />
{:else if locationError !== null}
  <PageHead title="Storage Location" />
  <ErrorState error={locationError}>
    <a slot="actions" href="#/storage">Back to storage</a>
  </ErrorState>
{:else}
  <PageHead>
    <svelte:fragment slot="description">
      <StorageBreadcrumb {trail} />
      <p class="muted">
        {location.gameCount} {plural(location.gameCount)} stored directly here
        {#if hasChildren}
          &middot; {location.totalGameCount} {plural(location.totalGameCount)} including sub-locations
        {/if}
      </p>
    </svelte:fragment>

    <svelte:fragment slot="actions">
      {#if hasChildren}
        <wa-switch checked={includeChildren} on:change={setIncludeChildren}>
          Include sub-locations
        </wa-switch>
      {/if}
    </svelte:fragment>
  </PageHead>

  {#if actionError !== null}
    <wa-callout variant="warning">{actionError}</wa-callout>
  {/if}

  <SlugList bggType="boardgame" baseLink="#/game/:slug" {loader} {loaderKey}
            extraColumns={extraColumns} gridKey="storage-contents"
            bind:this={list} bind:selectedKeys
            selectable={selecting} selectableRows={row => row.isOnShelf === true}>
    <svelte:fragment slot="actions">
      {#if selecting}
        <span class="selection-count">{selectedKeys.length} selected</span>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button appearance="plain" size="s" disabled={saving}
                   on:click={cancelSelecting}>Cancel</wa-button>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button appearance="outlined" size="s"
                   disabled={selectedKeys.length === 0 || saving}
                   on:click={openMove}>Move to location</wa-button>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button variant="warning" appearance="outlined" size="s"
                   disabled={selectedKeys.length === 0 || saving} loading={saving}
                   on:click={markOffShelf}>Mark off shelf</wa-button>
      {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button appearance="outlined" size="s" on:click={startSelecting}>
          Select games
        </wa-button>
      {/if}
    </svelte:fragment>
  </SlugList>

  {#if bulkOpen}
    <BulkStorageAssignDialog gameIds={[...selectedKeys]} mode="move"
                             consumer="storage-move" onclose={moveResult} />
  {/if}
{/if}


<style>
  .selection-count {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    white-space: nowrap;
  }
</style>
