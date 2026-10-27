<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The game whose metadata we want to display
  export let gameData = {};

  // An array of objects for the metadata to display; each object should have a
  // key that is the key in the gameData to get at the metadata, and a title
  // that is the title of the section to display.
  export let keyList = [];

  // ---------------------------------------------------------------------------

  // Return the class to use for a metadata link based on whether or not the
  // current user owns it; gameData is the data for the game, metaDataType is
  // the type of metadata being displayed, and rowData is the actual metadata
  // item.
  const metaClass = (gameData, metaDataType, rowData) => {
    // If the game is owned, and the metadata type being displayed is the one
    // from the ownership record, and the ID is the ID of the item that's owned,
    // highlight the text.
    if (gameData.owned !== undefined) {
      const { id, metaType } = gameData.owned.publisher;

      if (metaDataType === metaType && rowData.id === id) {
        return "meta-highlight";
      }
    }

    // Fallback; use normal text color.
    return "";
  }

</script>


<!-- *********************************************************************** -->


<div class="meta-grid">
  {#each keyList as metadata (metadata.key) }
    <div class="meta-title">{metadata.title}</div>
    <div class="meta-items">
      {#each gameData[metadata.key] as row (row.id)}
        <a class={metaClass(gameData, metadata.key, row)} href="#/{metadata.key}/{row.slug}">{row.name}</a>
      {/each}
    </div>
  {/each}
</div>


<!-- *********************************************************************** -->


<style>
  .meta-grid {
    display: grid;
    grid-template-columns: max-content auto;
    gap: 8px;
    align-items: baseline;
  }

  .meta-title {
    font-weight: var(--wa-font-weight-semibold);
    color: var(--wa-color-text-header);
  }

  .meta-items {
    display: flex;
    flex-direction: row;
    gap: 8px;
    flex-wrap: wrap;
  }

  .meta-items a.meta-highlight {
    color: var(--wa-color-brand-600);
    font-weight: var(--wa-font-weight-semibold);
  }
</style>
