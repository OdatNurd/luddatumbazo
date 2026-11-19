<script>
  import { api } from '$api';
  import { user } from '$stores/user';

  import SlugList from '$components/lists/SlugList.svelte';
  import PageHead from '$components/PageHead.svelte';
  import EmptyState from '$components/EmptyState.svelte';
  import StorageBreadcrumb from '$components/StorageBreadcrumb.svelte';
  import BulkStorageAssignDialog from '$components/dialogs/BulkStorageAssignDialog.svelte';

  // The route this page was opened from; the collection links here with
  // `from=collection` so the breadcrumb can offer a way back.
  export let routeInfo = {};

  let selectedKeys = [];
  let list = null;
  let count = null;
  let assignOpen = false;

  const trail = [{ label: 'Unstored' }];

  $: origin = routeInfo.query?.from === 'collection'
    ? { label: 'Collection', href: '#/games/owned' }
    : undefined;

  const loader = async () => {
    const result = await api.household.storage.unstored($user.household);
    count = result.length;
    return result;
  };

  const clearSelection = () => selectedKeys = [];
  const plural = value => value === 1 ? 'game' : 'games';

  const openAssign = () => {
    if (selectedKeys.length === 0) {
      return;
    }

    assignOpen = true;
  };

  const assignResult = detail => {
    assignOpen = false;

    if (detail?.result !== null && detail?.result !== undefined) {
      selectedKeys = [];
      list?.refresh();
    }
  };
</script>


{#if !$user.household}
  <PageHead title="Unstored" />
  <EmptyState title="No household yet"
              description="You need to belong to a household before you can manage unstored games." />
{:else}
  <PageHead>
    <svelte:fragment slot="description">
      <StorageBreadcrumb {trail} {origin} />
      <p class="muted">
        Games that do not have a storage location yet.
        {#if count !== null}
          {count} {plural(count)} waiting to be put away.
        {/if}
      </p>
    </svelte:fragment>
  </PageHead>

  <SlugList bggType="boardgame" baseLink="#/game/:slug" {loader}
            gridKey="unstored" bind:this={list} bind:selectedKeys selectable
            emptyMessage="Everything is stored.">
    <svelte:fragment slot="actions">
      {#if selectedKeys.length > 0}
        <span class="selection-count">{selectedKeys.length} selected</span>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button appearance="plain" size="s" on:click={clearSelection}>Clear</wa-button>
      {/if}

      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button variant="brand" appearance="filled" size="s"
                 disabled={selectedKeys.length === 0} on:click={openAssign}>
        {#if selectedKeys.length > 0}
          Assign storage {selectedKeys.length}
        {:else}
          Assign storage
        {/if}
      </wa-button>
    </svelte:fragment>
  </SlugList>

  {#if assignOpen}
    <BulkStorageAssignDialog gameIds={[...selectedKeys]} mode="assign"
                             consumer="unstored-assign" onclose={assignResult} />
  {/if}
{/if}


<style>
  .selection-count {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    white-space: nowrap;
  }
</style>
