<script>
  import SlugList from '$components/SlugList.svelte';
</script>

<h3>Game List</h3>
<SlugList bggType='boardgame' baseLink='#/game/:slug' query='/game/list' />
