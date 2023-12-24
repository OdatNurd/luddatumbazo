<script>
  import DetailsPane from '$components/GameDetailsPane.svelte';

  import { location } from 'svelte-spa-router';

  // ---------------------------------------------------------------------------

  // Get the slug from the URI, which is the game slug to display; this can be
  // either a number or a string, and changing it will re-render the component.
  let slug = undefined;

  $: slug = $location.split('/').at(-1);

  // ---------------------------------------------------------------------------
</script>

{#key slug}
  <DetailsPane {slug} />
{/key}
