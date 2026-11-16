<script>
  import { api } from '$api';
  import { user } from '$stores/user';

  import * as cells from '$lib/cells.js';
  import SlugList from '$components/lists/SlugList.svelte';

  // The current shelf/status filter. Changing this also changes loaderKey,
  // which makes SlugList reload and apply the filter again.
  let status = 'all';

  const loader = async () => api.household.collection.contents($user.household);

  const filter = rows => rows.filter(row => {
    if (status === 'all') return true;
    if (status === 'unstored') return !row.storagePath;
    if (status === 'on') return row.storagePath && row.isOnShelf === true;
    if (status === 'off') return row.storagePath && row.isOnShelf !== true;
    return true;
  });

  const storageColumns = [
    {
      field: 'storagePath',
      label: 'Storage',
      flex: 1.4,
      filterable: true,
      filterType: 'text',
      formatter: value => value || 'Unstored'
    },
    {
      field: 'isOnShelf',
      label: 'Shelf',
      width: 120,
      formatter: (value, row) => {
        if (!row.storagePath) return '—';
        return value
          ? cells.badge('On shelf', 'success')
          : cells.badge('Off shelf', 'warning');
      }
    }
  ];

  const pick = event => status = event.target.value;
</script>

{#if $user.household}
  <h3>Games owned by {$user.household?.name ?? 'Unknown'}</h3>

  <SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} {filter}
            extraColumns={storageColumns} loaderKey={status} gridKey="owned">
    <svelte:fragment slot="actions">
      <wa-select size="s" label="Shelf" value={status}
                 on:change={pick} on:wa-input={pick}>
        <wa-option value="all">All games</wa-option>
        <wa-option value="unstored">Unstored</wa-option>
        <wa-option value="on">On shelf</wa-option>
        <wa-option value="off">Off shelf</wa-option>
      </wa-select>

      <a class="storage-link" href="#/storage">Manage storage</a>
    </svelte:fragment>
  </SlugList>
{:else}
  <p>No collection; you do not belong to any households yet!</p>
{/if}

<style>
  .storage-link {
    white-space: nowrap;
    font-size: var(--wa-font-size-s);
  }
</style>
