<script>
  import { Select } from "@axel669/zephyr";

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

  const loadWishlistNames = async () => {
    const rawData = await api.household.wishlist.lists.list($user.household);
    return rawData.map(e => ({ label: e.name, value: e.slug}));
  }

</script>

{#if $user.household}
  <h3>Games Wishlists for {$user.household?.name ?? 'Unknown'}</h3>
  <Select label="Wishlist" color="@primary" options={$wishlists} bind:value={loaderKey} />
  <SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} {loaderKey} />
{:else}
  No wishlists; you do not belong to any households yet!
{/if}