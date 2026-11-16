<script>
  import { api } from '$api';
  import { user } from '$stores/user';

  import SlugList from '$components/lists/SlugList.svelte';
  import StorageBreadcrumb from '$components/StorageBreadcrumb.svelte';
  import BulkStorageAssignDialog from '$components/dialogs/BulkStorageAssignDialog.svelte';

  let selectedKeys = [];
  let list = null;
  let count = null;
  let assignOpen = false;

  const trail = [{ label: 'Unstored' }];

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
  <h3>Unstored</h3>
  <p>No storage; you do not belong to a household yet.</p>
{:else}
  <div class="page-head">
    <div class="heading">
      <StorageBreadcrumb {trail} />
      <p class="muted">
        Games that do not have a storage location yet.
        {#if count !== null}
          {count} {plural(count)} waiting to be put away.
        {/if}
      </p>
    </div>
  </div>

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

  .page-head p {
    margin: 4px 0 0;
  }

  .selection-count {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    white-space: nowrap;
  }
</style>
