<script>
  import { api } from '$api';
  import { user } from '$stores/user';

  import * as cells from '$lib/cells.js';
  import SlugList from '$components/lists/SlugList.svelte';
  import Icon from '$components/Icon.svelte';
  import PageHead from '$components/PageHead.svelte';
  import EmptyState from '$components/EmptyState.svelte';
  import SummaryGrid from '$components/SummaryGrid.svelte';
  import SummaryCard from '$components/SummaryCard.svelte';

  // The current shelf/status filter. Changing this also changes loaderKey,
  // which makes SlugList reload and apply the filter again.
  let status = 'all';

  const loader = async () => api.household.collection.contents($user.household);

  // The unfiltered collection, so the summary keeps showing every shelf state
  // even while one of them is selected in the filter.
  let collection = null;

  $: total = collection === null ? '—' : collection.length;
  $: unstored = collection === null
    ? '—'
    : collection.filter(row => !row.storagePath).length;
  $: onShelf = collection === null
    ? '—'
    : collection.filter(row => row.storagePath && row.isOnShelf === true).length;
  $: offShelf = collection === null
    ? '—'
    : collection.filter(row => row.storagePath && row.isOnShelf !== true).length;

  const loaded = rows => collection = rows;

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

  // The storage button is icon-only, so it needs a native tooltip. Web
  // Awesome's custom elements do not reflect the `title` property, so the
  // attribute has to be set directly for the browser to show it.
  let storageButton = null;

  $: if (storageButton !== null) {
    storageButton.setAttribute('title', 'Manage storage');
  }
</script>

{#if $user.household}
  <PageHead title="Collection"
            description={`Games owned by ${$user.household?.name ?? 'Unknown'}.`}
            hideDescriptionOnNarrow>
    <svelte:fragment slot="actions">
      <wa-select size="s" class="wa-visually-hidden-label collection-filter"
                 label="Shelf" value={status} on:change={pick} on:wa-input={pick}>
        <wa-option value="all">All games</wa-option>
        <wa-option value="unstored">Unstored</wa-option>
        <wa-option value="on">On shelf</wa-option>
        <wa-option value="off">Off shelf</wa-option>
      </wa-select>

      <!-- The same box icon the profile drawer and storage tree use, so the
           action reads as "storage" without spending a row of header space. -->
      <wa-button bind:this={storageButton} size="s" variant="brand" appearance="filled"
                 href="#/storage" aria-label="Manage storage">
        <Icon name="box-seam" />
      </wa-button>
    </svelte:fragment>
  </PageHead>

  <SummaryGrid>
    <SummaryCard label="All games" value={total} note="in the collection" />
    <SummaryCard label="Unstored" value={unstored} note="no location"
                 href="#/storage/unstored?from=collection"
                 title="Assign storage to unstored games" />
    <SummaryCard label="On shelf" value={onShelf} note="browse storage locations"
                 href="#/storage"
                 title="Browse the storage locations holding these games" />
    <SummaryCard label="Off shelf" value={offShelf} note="stored but off shelf"
                 href="#/storage/off-shelf?from=collection"
                 title="Reshelve games that are off shelf" />
  </SummaryGrid>

  <SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} {filter}
            onrows={loaded} extraColumns={storageColumns} loaderKey={status}
            gridKey="owned" />
{:else}
  <PageHead title="Collection" />
  <EmptyState title="No household yet"
              description="You need to belong to a household before you can view a collection." />
{/if}

