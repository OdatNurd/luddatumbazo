<script>
  import { api } from '$api';
  import { user } from '$stores/user';

  import SlugList from '$components/lists/SlugList.svelte';

  const loader = async () => api.household.collection.contents($user.household);
</script>

{#if $user.household}
  <h3>Games owned by {$user.household?.name ?? 'Unknown'}</h3>
  <SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} />
{:else}
  No collection; you do not belong to any households yet!
{/if}