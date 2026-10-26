<script>
  import { api } from '$api';

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

  // The capitalized type, for button and dialog captions.
  $: niceType = metaType.charAt(0).toUpperCase() + metaType.slice(1);

  // The list itself, so that it can be refreshed once a new record is added.
  let list = null;

  // The state of the add record dialog.
  let addDialogOpen = false;

  // When the dialog completes with a new record, refresh the list so that the
  // record shows up in it.
  const added = event => {
    addDialogOpen = false;

    if (event.detail?.result != null) {
      list?.refresh();
    }
  };
</script>

<h3>{metaType} List</h3>
<SlugList bind:this={list} bggType='boardgame{metaType}' baseLink='#/{metaType}/:slug'
          {loader} gridKey={`meta:${metaType}`}>
  <svelte:fragment slot="actions">
    <IconButton fill color="@primary" title="Add a new {metaType}"
                caption="Add {niceType}" icon="plus-lg"
                on:click={() => addDialogOpen = true} />
  </svelte:fragment>
</SlugList>

<MetaDataAddDialog open={addDialogOpen} {metaType} on:close={added} />

<style>
  h3 {
    text-transform: capitalize;
  }
</style>