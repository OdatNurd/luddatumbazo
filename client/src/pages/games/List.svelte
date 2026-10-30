<script>
  import { api } from '$api';

  import SlugList from '$components/lists/SlugList.svelte';
  import IconButton from '$components/IconButton.svelte';
  import GameEditDialog from '$components/dialogs/GameEditDialog.svelte';

  const loader = async () => api.game.list();

  // The state of the add game dialog; no record is passed, which is what puts
  // the dialog into add mode.
  let addDialogOpen = false;

  // The game list, so that a successful add can refresh it in place.
  let gameList = null;

  // Close the dialog and, when a game was added, reload the list so the new
  // record is visible without a full page reload.
  const closeAddDialog = ({ result }) => {
    addDialogOpen = false;

    if (result !== null && result !== undefined) {
      gameList?.refresh();
    }
  };
</script>

<h3>Game List</h3>
<SlugList bind:this={gameList} bggType='boardgame' baseLink='#/game/:slug' {loader} gridKey="games">
  <!-- BGG import flows are handled through the game dialog's BGG lookup
       (pending the BGG API token), so no separate import buttons live here. -->
  <svelte:fragment slot="actions">
    <IconButton variant="brand" appearance="filled" title="Add a new game"
                caption="" icon="plus-lg"
                onclick={() => addDialogOpen = true} />
  </svelte:fragment>
</SlugList>

<GameEditDialog open={addDialogOpen} onclose={closeAddDialog} />
