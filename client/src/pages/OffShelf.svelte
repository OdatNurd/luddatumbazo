<script>
  import { api } from '$api';
  import { user } from '$stores/user';

  import * as cells from '$lib/cells.js';
  import SlugList from '$components/lists/SlugList.svelte';
  import Confirm from '$components/Confirm.svelte';
  import Icon from '$components/Icon.svelte';

  // The games that are waiting to go back to a shelf, and the selection the
  // user has made from that list.
  let selectedKeys = [];
  let list = null;
  let count = null;

  // The bulk reshelve request and its confirmation dialog.
  let confirmModal = null;
  let reshelving = false;
  let actionError = null;

  // The list itself carries the full storage path so each game says where it
  // belongs. The server orders by location and then name, which is the order
  // of the shelves rather than the alphabet.
  const loader = async () => {
    const result = await api.household.storage.offShelf($user.household);
    count = result.length;
    return result;
  };

  const locationColumn = {
    field: 'storagePath',
    label: 'Location',
    flex: 2,
    filterable: true,
    filterType: 'text',
    formatter: value => cells.badge(value ?? 'Unknown location')
  };

  const clearSelection = () => selectedKeys = [];

  const plural = value => value === 1 ? 'game' : 'games';

  const reshelve = async () => {
    if (selectedKeys.length === 0 || reshelving === true) {
      return;
    }

    const amount = selectedKeys.length;
    const confirmed = await confirmModal.show({
      title: 'Reshelve games?',
      message: `Reshelve ${amount} ${plural(amount)}? They will be marked on shelf; their storage locations will not change.`,
      confirmLabel: 'Reshelve',
      confirmVariant: 'brand'
    });

    if (confirmed === false) {
      return;
    }

    reshelving = true;
    actionError = null;

    try {
      await api.household.storage.shelf($user.household, selectedKeys, true);
      selectedKeys = [];
      list?.refresh();
    }
    catch (failure) {
      actionError = failure.message ?? 'unable to reshelve those games';
    }
    finally {
      reshelving = false;
    }
  };
</script>


{#if !$user.household}
  <h3>Off shelf</h3>
  <p>No storage; you do not belong to a household yet.</p>
{:else}
  <div class="page-head">
    <div class="heading">
      <a class="back-link" href="#/storage">
        <Icon name="arrow-left" /> Storage
      </a>
      <h3>Off shelf</h3>
      <p class="muted">
        Games with a storage location that are currently off shelf.
        {#if count !== null}
          {count} {plural(count)} waiting to go back.
        {/if}
      </p>
    </div>
  </div>

  {#if actionError !== null}
    <wa-callout variant="warning">{actionError}</wa-callout>
  {/if}

  <SlugList bggType="boardgame" baseLink="#/game/:slug" {loader}
            extraColumns={[locationColumn]} gridKey="off-shelf"
            bind:this={list} bind:selectedKeys selectable
            emptyMessage="Everything is shelved.">
    <svelte:fragment slot="actions">
      {#if selectedKeys.length > 0}
        <span class="selection-count">{selectedKeys.length} selected</span>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button appearance="plain" size="s" disabled={reshelving}
                   on:click={clearSelection}>Clear</wa-button>
      {/if}

      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button variant="brand" appearance="filled" size="s"
                 disabled={selectedKeys.length === 0 || reshelving} loading={reshelving}
                 on:click={reshelve}>
        {#if selectedKeys.length > 0}
          Reshelve {selectedKeys.length}
        {:else}
          Reshelve
        {/if}
      </wa-button>
    </svelte:fragment>
  </SlugList>
{/if}

<Confirm bind:this={confirmModal} />


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
  }

  .page-head p {
    margin: 0;
  }

  .selection-count {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    white-space: nowrap;
  }
</style>