<script>
  import { api } from '$api';
  import { user } from '$stores/user';

  import SlugList from '$components/lists/SlugList.svelte';

  const loader = async () => api.household.wishlist.contents.get($user);
</script>

<h3>Games Wishlist for {$user?.household.name ?? 'Unknown'}</h3>
<SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} />
