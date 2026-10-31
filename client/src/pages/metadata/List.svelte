<script>
  import { api } from '$api';
  import { invalidateSearch } from '$stores/search';

  import SlugList from '$components/lists/SlugList.svelte';
  import IconButton from '$components/IconButton.svelte';
  import MetaDataAddDialog from '$components/dialogs/MetaDataAddDialog.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The type of metadata that this list is supposed to contain. This controls
  // how this page sources its data and what links it generates.
  export let metaType = 'artist';

  const loader = async () => api.metadata.list(metaType);

  // The list itself, so that it can be refreshed once a new record is added.
  let list = null;

  // The state of the add record dialog.
  let addDialogOpen = false;

  // When the dialog completes with a new record, refresh the list and discard
  // the search index so that the record shows up everywhere.
  const added = detail => {
    addDialogOpen = false;

    if (detail?.result != null) {
      invalidateSearch();
      list?.refresh();
    }
  };
</script>

<h3>{metaType} List</h3>
<SlugList bind:this={list} bggType='boardgame{metaType}' baseLink='#/{metaType}/:slug'
          {loader} gridKey={`meta:${metaType}`}>
  <svelte:fragment slot="actions">
    <IconButton variant="brand" appearance="filled" title="Add a new {metaType}"
                caption="" icon="plus-lg"
                onclick={() => addDialogOpen = true} />
  </svelte:fragment>
</SlugList>

<MetaDataAddDialog open={addDialogOpen} {metaType} onclose={added} />

<style>
  h3 {
    text-transform: capitalize;
  }
</style>