<script>
  import SlugList from '$components/SlugList.svelte';

  import { user } from '$stores/user';
</script>

<h3>Games owned by {$user?.household.name ?? 'Unknown'}</h3>
<SlugList bggType='boardgame' baseLink='#/game/:slug' query='/household/collection/{$user?.household.slug}' />
