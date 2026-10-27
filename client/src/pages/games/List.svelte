<script>
  import { api } from '$api';

  import SlugList from '$components/lists/SlugList.svelte';
  import IconButton from '$components/IconButton.svelte';

  const loader = async () => api.game.list();
</script>

<h3>Game List</h3>
<SlugList bggType='boardgame' baseLink='#/game/:slug' {loader}>
  <!-- Placeholder operations for the upcoming game entry/import work; the
       buttons are in place but disabled until those flows land. -->
  <svelte:fragment slot="actions">
    <IconButton disabled fill color="@primary" title="Coming soon"
                caption="Add Game" icon="plus-lg" />
    <IconButton disabled outline color="@secondary" title="Coming soon"
                caption="Import BGG Game" icon="box-arrow-in-right" />
    <IconButton disabled outline color="@secondary" title="Coming soon"
                caption="Import BGG Game List" icon="list-ul" />
  </svelte:fragment>
</SlugList>
