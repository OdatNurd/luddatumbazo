<script>
  import { api } from '$api';
  import { user } from '$stores/user';

  import SlugList from '$components/SlugList.svelte';

  const loader = async () => api.household.collection.list($user);
</script>

<h3>Games owned by {$user?.household.name ?? 'Unknown'}</h3>
<SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} />
