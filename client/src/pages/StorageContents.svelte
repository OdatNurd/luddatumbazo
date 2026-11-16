<script>
  import { onMount } from 'svelte';

  import { api } from '$api';
  import { user } from '$stores/user';

  import * as cells from '$lib/cells.js';
  import SlugList from '$components/lists/SlugList.svelte';
  import Icon from '$components/Icon.svelte';

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

  // Load the full tree so the header can show the path, both counts and
  // whether the toggle has anything to do. The grid itself loads independently.
  const loadLocation = async () => {
    if (!$user.household) {
      loadingLocation = false;
      return;
    }

    loadingLocation = true;
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
      loadingLocation = false;
    }
  };

  onMount(loadLocation);

  $: hasChildren = location !== null &&
    locations.some(entry => entry.parentId === location.id);

  const loader = async () => api.household.storage.contents(
    $user.household, storageKey, includeChildren
  );

  $: loaderKey = `${storageKey}:${includeChildren ? 'subtree' : 'direct'}`;

  const setIncludeChildren = event => includeChildren = event.target.checked;

  // A location path is already shown in the page heading, so the Storage
  // column is only useful when the view spans several sub-locations.
  const storageColumn = {
    field: 'storagePath',
    label: 'Storage',
    flex: 1.4,
    filterable: true,
    filterType: 'text',
    formatter: value => value || '—'
  };

  const shelfColumn = {
    field: 'isOnShelf',
    label: 'Shelf',
    width: 120,
    formatter: value => value
      ? cells.badge('On shelf', 'success')
      : cells.badge('Off shelf', 'warning')
  };

  $: extraColumns = includeChildren
    ? [storageColumn, shelfColumn]
    : [shelfColumn];

  const plural = count => count === 1 ? 'game' : 'games';
</script>


{#if !$user.household}
  <h3>Storage</h3>
  <p>No storage; you do not belong to a household yet.</p>
{:else if loadingLocation}
  <div class="loading"><wa-spinner></wa-spinner></div>
{:else if locationError !== null}
  <h3>Storage Location</h3>
  <wa-callout variant="danger">{locationError}</wa-callout>
  <p><a href="#/storage">Back to storage</a></p>
{:else}
  <div class="page-head">
    <div class="heading">
      <a class="back-link" href="#/storage">
        <Icon name="arrow-left" /> Storage
      </a>
      <h3>{location.path}</h3>
      <p class="muted">
        {location.gameCount} {plural(location.gameCount)} stored directly here
        {#if hasChildren}
          &middot; {location.totalGameCount} {plural(location.totalGameCount)} including sub-locations
        {/if}
      </p>
    </div>

    {#if hasChildren}
      <wa-switch checked={includeChildren} on:change={setIncludeChildren}>
        Include sub-locations
      </wa-switch>
    {/if}
  </div>

  <SlugList bggType="boardgame" baseLink="#/game/:slug" {loader} {loaderKey}
            extraColumns={extraColumns} gridKey="storage-contents" />
{/if}


<style>
  .page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .heading {
    min-width: 0;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    text-decoration: none;
  }

  .back-link:hover,
  .back-link:focus-visible {
    color: var(--wa-color-text-normal);
    text-decoration: underline;
  }

  h3 {
    margin: 2px 0 2px;
    overflow-wrap: anywhere;
  }

  .page-head p {
    margin: 0;
  }

  .loading {
    display: flex;
    justify-content: center;
    padding: 32px;
  }
</style>
