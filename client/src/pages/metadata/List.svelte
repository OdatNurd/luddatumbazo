<script>
  import { api } from '$api';
  import { invalidateSearch } from '$stores/search';

  import SlugList from '$components/lists/SlugList.svelte';
  import PageHead from '$components/PageHead.svelte';
  import IconButton from '$components/IconButton.svelte';
  import MetaDataAddDialog from '$components/dialogs/MetaDataAddDialog.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The type of metadata that this list is supposed to contain. This controls
  // how this page sources its data and what links it generates.
  export let metaType = 'artist';

  // The page title uses the plural label rather than a CSS-capitalized raw
  // type name, so stored names and labels are never mangled by the browser.
  const labels = {
    category:  'Categories',
    mechanic:  'Mechanics',
    designer:  'Designers',
    artist:    'Artists',
    publisher: 'Publishers'
  };

  $: title = labels[metaType] ?? `${metaType} List`;

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

<PageHead {title}>
  <svelte:fragment slot="actions">
    <IconButton variant="brand" appearance="filled" title="Add a new {metaType}"
                caption="" icon="plus-lg"
                onclick={() => addDialogOpen = true} />
  </svelte:fragment>
</PageHead>

<SlugList bind:this={list} bggType='boardgame{metaType}' baseLink='#/{metaType}/:slug'
          {loader} gridKey={`meta:${metaType}`} />

<MetaDataAddDialog open={addDialogOpen} {metaType} onclose={added} />