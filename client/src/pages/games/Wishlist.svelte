<script>
  import { api } from '$api';
  import { user } from '$stores/user';
  import { wishlists } from '$stores/wishlists';

  import SlugList from '$components/lists/SlugList.svelte';
  import PageHead from '$components/PageHead.svelte';
  import EmptyState from '$components/EmptyState.svelte';
  import SummaryGrid from '$components/SummaryGrid.svelte';
  import SummaryCard from '$components/SummaryCard.svelte';

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

  // The rows behind the grid, used to summarize the selected wishlist.
  let rows = null;

  $: count = rows === null ? '—' : rows.length;

  const loaded = result => rows = result;

</script>

{#if $user.household}
  <PageHead title="Wishlists"
            description={`Wishlists for ${$user.household?.name ?? 'Unknown'}.`}
            hideDescriptionOnNarrow>
    <svelte:fragment slot="actions">
      <wa-select size="s" label="Wishlist" value={loaderKey} on:change={pick} on:wa-input={pick}>
        {#each $wishlists as entry (entry.value)}
          <wa-option value={entry.value}>{entry.label}</wa-option>
        {/each}
      </wa-select>
    </svelte:fragment>
  </PageHead>

  <SummaryGrid>
    <SummaryCard label="Games" value={count} note="in this wishlist" />
    <SummaryCard label="Wishlists" value={$wishlists.length} note="defined" />
  </SummaryGrid>

  <SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} onrows={loaded}
            {loaderKey} gridKey="wishlists" />
{:else}
  <PageHead title="Wishlists" />
  <EmptyState title="No household yet"
              description="You need to belong to a household before you can view wishlists." />
{/if}
