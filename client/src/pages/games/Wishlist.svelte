<script>
  import { api } from '$api';
  import { user } from '$stores/user';
  import { wishlists } from '$stores/wishlists';

  import SlugList from '$components/lists/SlugList.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Receive paramters from the URL route that landed us on this page; this
  // will contain the slug that we need in order to display the details pane.
  // The paramters come from the named arguments in the route itself.
  export let routeInfo = {};

  // ---------------------------------------------------------------------------

  let loaderKey = routeInfo.params.wishlist ?? 'root';
  const loader = async wishlistSlug => api.household.wishlist.contents.get($user.household, wishlistSlug);

  // Keep the list selection up to date regardless of which change style the
  // underlying component fires.
  const pick = event => loaderKey = event.target.value;

</script>

{#if $user.household}
  <h3>Games Wishlists for {$user.household?.name ?? 'Unknown'}</h3>
  <wa-select label="Wishlist" value={loaderKey} on:change={pick} on:wa-input={pick}>
    {#each $wishlists as entry (entry.value)}
      <wa-option value={entry.value}>{entry.label}</wa-option>
    {/each}
  </wa-select>
  <SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} {loaderKey} gridKey="wishlists" />
{:else}
  No wishlists; you do not belong to any households yet!
{/if}
