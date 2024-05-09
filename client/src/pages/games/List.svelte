<script>
  import { api } from '$api';

  import SlugList from '$components/lists/SlugList.svelte';

  const loader = async () => api.game.list();
</script>

<h3>Game List</h3>
<SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} />
