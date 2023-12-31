<script>
  import SessionList from '$components/SessionList.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Receive paramters from the URL route that landed us on this page; this
  // will contain the slug that we need in order to display the details pane.
  // The paramters come from the named arguments in the route itself.
  export let params = {};
</script>

<h3>Session Reports FOR A GAME</h3>
<SessionList query='/session/list?games={params.slug}' />
