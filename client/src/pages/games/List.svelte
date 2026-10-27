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
<SlugList bggType='boardgame' baseLink='#/game/:slug' {loader}>
  <!-- The import operations are placeholders for the upcoming BGG import
       work; the buttons are in place but disabled until those flows land. -->
  <svelte:fragment slot="actions">
    <IconButton fill color="@primary" title="Add a new game"
                caption="Add Game" icon="plus-lg"
                on:click={() => addDialogOpen = true} />
    <IconButton disabled outline color="@secondary" title="Coming soon"
                caption="Import BGG Game" icon="box-arrow-in-right" />
    <IconButton disabled outline color="@secondary" title="Coming soon"
                caption="Import BGG Game List" icon="list-ul" />
  </svelte:fragment>
</SlugList>

<GameEditDialog open={addDialogOpen} on:close={() => addDialogOpen = false} />
