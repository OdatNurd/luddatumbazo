<script>
  import { LoadZone, Select } from "@axel669/zephyr";

  import { api } from '$api';
  import { user } from '$stores/user';

  import SlugList from '$components/lists/SlugList.svelte';

  let loaderKey = 'root';
  const loader = async wishlistSlug => api.household.wishlist.contents.get($user, wishlistSlug);

  const loadWishlistNames = async () => {
    const rawData = await api.household.wishlist.lists.list($user);
    return rawData.map(e => ({ label: e.name, value: e.slug}));
  }

</script>


<h3>Games Wishlists for {$user?.household.name ?? 'Unknown'}</h3>
<LoadZone source={loadWishlistNames()} let:result>
  <Select label="Wishlist" color="@primary" options={result} bind:value={loaderKey} />
  <SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} {loaderKey} />
</LoadZone>
