<script>
  import DetailsPane from '$components/GameDetailsPane.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Receive paramters from the URL route that landed us on this page; this
  // will contain the slug that we need in order to display the details pane.
  // The paramters come from the named arguments in the route itself.
  export let params = {};

  // ---------------------------------------------------------------------------
</script>

{#key params.slug}
  <DetailsPane slug={params.slug} />
{/key}
