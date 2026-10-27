<script>
  import { api } from '$api';

  import SlugList from '$components/lists/SlugList.svelte';
  import IconButton from '$components/IconButton.svelte';
  import GameEditDialog from '$components/dialogs/GameEditDialog.svelte';

  const loader = async () => api.game.list();

  // The state of the add game dialog; no record is passed, which is what puts
  // the dialog into add mode.
  let addDialogOpen = false;
</script>

<h3>Game List</h3>
<SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} gridKey="games">
  <!-- BGG import flows are handled through the game dialog's BGG lookup
       (pending the BGG API token), so no separate import buttons live here. -->
  <svelte:fragment slot="actions">
    <IconButton variant="brand" appearance="filled" title="Add a new game"
                caption="" icon="plus-lg"
                onclick={() => addDialogOpen = true} />
  </svelte:fragment>
</SlugList>

<GameEditDialog open={addDialogOpen} onclose={() => addDialogOpen = false} />
