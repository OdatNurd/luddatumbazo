<script>
  import { Flex, Grid, Link } from "@axel669/zephyr";

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

  // Return the color to use for a metadata link based on whether or not the
  // current user owns it; gameData is the data for the game, metaDataType is
  // the type of metadata being displayed, and rowData is the actual metadata
  // item.
  const metaColor = (gameData, metaDataType, rowData) => {
    // If the game is owned, and the metadata type being displayed is the one
    // from the ownership record, and the ID is the ID of the item that's owned,
    // color the text.
    if (gameData.owned !== undefined) {
      const { id, metaType } = gameData.owned.publisher;

      if (metaDataType === metaType && rowData.id === id) {
        return "@primary";
      }
    }

    // Fallback; use normal text color.
    return null;
  }

</script>


<!-- *********************************************************************** -->


<Grid cols="max-content auto" gap="8px">
  {#each keyList as metadata (metadata.key) }
    <Flex>{metadata.title}</Flex>
    <Flex direction="row" gap="4px" fl.wr="wrap">
      {#each gameData[metadata.key] as row (row.id)}
        <Link href="#/{metadata.key}/{row.slug}" color={metaColor(gameData, metadata.key, row)}>{row.name}</Link>
      {/each}
    </Flex>
  {/each}
</Grid>


<!-- *********************************************************************** -->
