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

  const loader = async () => api.household.collection.contents($user.household);

  // The complete collection; the summary cards break it down by shelf state.
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
            hideDescriptionOnNarrow inlineActionsOnNarrow>
    <svelte:fragment slot="actions">
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

  <SlugList bggType='boardgame' baseLink='#/game/:slug' {loader}
            onrows={loaded} extraColumns={storageColumns} gridKey="owned" />
{:else}
  <PageHead title="Collection" />
  <EmptyState title="No household yet"
              description="You need to belong to a household before you can view a collection." />
{/if}

