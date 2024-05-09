<script>
  import { api } from '$api';

  import SessionList from '$components/lists/SessionList.svelte';
  import BackButton from '$components/BackButton.svelte';


  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Receive paramters from the URL route that landed us on this page; this
  // will contain the slug that we need in order to display the details pane.
  // The paramters come from the named arguments in the route itself.
  export let params = {};

  // Fetch a list of all of the session reports for the game that we have been
  // invoked for.
  const loader = async () => api.session.list(true, params.slug)
</script>

<BackButton>
  <h3>Session Reports FOR A GAME</h3>
</BackButton>

<SessionList {loader} />
