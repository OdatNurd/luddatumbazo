<script>
  import { api } from '$api';
  import { invalidateSearch } from '$stores/search';
  import {
    metadataDescriptions,
    metadataLabels,
    metadataPlurals,
    metadataSingularLabels
  } from '$lib/metadata.js';

  import SlugList from '$components/lists/SlugList.svelte';
  import PageHead from '$components/PageHead.svelte';
  import SummaryGrid from '$components/SummaryGrid.svelte';
  import SummaryCard from '$components/SummaryCard.svelte';
  import IconButton from '$components/IconButton.svelte';
  import MetaDataAddDialog from '$components/dialogs/MetaDataAddDialog.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The type of metadata that this list is supposed to contain. This controls
  // how this page sources its data and what links it generates.
  export let metaType = 'artist';

  // The shared metadata module owns the labels, plurals and descriptive copy,
  // so the list, detail and add-dialog pages cannot drift apart.
  $: title = metadataLabels[metaType] ?? `${metaType} List`;
  $: plural = metadataPlurals[metaType] ?? `${metaType} records`;
  $: description = metadataDescriptions[metaType];

  const loader = async () => api.metadata.list(metaType);

  // The rows behind the grid, used to summarize the whole list.
  let records = null;

  $: total = records === null ? '—' : records.length;
  $: linked = records === null ? '—' : records.filter(entry => Number(entry.bggId) > 0).length;
  $: local = records === null ? '—' : records.filter(entry => !(Number(entry.bggId) > 0)).length;

  const loaded = rows => records = rows;

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

<PageHead {title} {description} hideDescriptionOnNarrow inlineActionsOnNarrow>
  <svelte:fragment slot="actions">
    <IconButton variant="brand" appearance="filled" title="Add a new {metaType}"
                caption="" label={`Add ${metadataSingularLabels[metaType] ?? metaType}`}
                icon="plus-lg"
                onclick={() => addDialogOpen = true} />
  </svelte:fragment>
</PageHead>

<SummaryGrid>
  <SummaryCard label="Total" value={total} note={plural} />
  <SummaryCard label="BGG linked" value={linked} note="imported from BoardGameGeek" />
  <SummaryCard label="Hand made" value={local} note="no BGG id" />
</SummaryGrid>

<SlugList bind:this={list} bggType='boardgame{metaType}' baseLink='#/{metaType}/:slug'
          {loader} onrows={loaded} gridKey={`meta:${metaType}`} />

<MetaDataAddDialog open={addDialogOpen} {metaType} onclose={added} />