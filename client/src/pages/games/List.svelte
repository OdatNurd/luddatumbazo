<script>
  import { api } from '$api';
  import { invalidateSearch } from '$stores/search';

  import SlugList from '$components/lists/SlugList.svelte';
  import PageHead from '$components/PageHead.svelte';
  import SummaryGrid from '$components/SummaryGrid.svelte';
  import SummaryCard from '$components/SummaryCard.svelte';
  import IconButton from '$components/IconButton.svelte';
  import GameEditDialog from '$components/dialogs/GameEditDialog.svelte';

  const loader = async () => api.game.list();

  // The state of the add game dialog; no record is passed, which is what puts
  // the dialog into add mode.
  let addDialogOpen = false;

  // The game list, so that a successful add can refresh it in place.
  let gameList = null;

  // The rows behind the grid, used to summarize the whole list.
  let games = null;

  $: total = games === null ? '—' : games.length;
  $: linked = games === null ? '—' : games.filter(game => Number(game.bggId) > 0).length;
  $: local = games === null ? '—' : games.filter(game => !(Number(game.bggId) > 0)).length;

  const loaded = rows => games = rows;

  // Close the dialog and, when a game was added, reload the list and discard
  // the search index so the new record is visible without a full page reload.
  const closeAddDialog = ({ result }) => {
    addDialogOpen = false;

    if (result !== null && result !== undefined) {
      invalidateSearch();
      gameList?.refresh();
    }
  };
</script>

<PageHead title="Games"
          description="The shared catalog of every game known to the household."
          hideDescriptionOnNarrow>
  <!-- BGG import flows are handled through the game dialog's BGG lookup
       (pending the BGG API token), so no separate import button lives in the
       grid toolbar. -->
  <svelte:fragment slot="actions">
    <IconButton variant="brand" appearance="filled" title="Add a new game"
                caption="" label="Add game" icon="plus-lg"
                onclick={() => addDialogOpen = true} />
  </svelte:fragment>
</PageHead>

<SummaryGrid>
  <SummaryCard label="Total" value={total} note="games" />
  <SummaryCard label="BGG linked" value={linked} note="imported from BoardGameGeek" />
  <SummaryCard label="Local only" value={local} note="no BGG id" />
</SummaryGrid>

<SlugList bind:this={gameList} bggType='boardgame' baseLink='#/game/:slug' {loader}
          onrows={loaded} gridKey="games" />

<GameEditDialog open={addDialogOpen} onclose={closeAddDialog} />
