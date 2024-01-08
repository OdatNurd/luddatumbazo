<script>
  import { Flex } from '@axel669/zephyr';

  import SessionList from '$components/SessionList.svelte';
  import BackButton from '$components/BackButton.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Receive paramters from the URL route that landed us on this page; this
  // will contain the slug that we need in order to display the details pane.
  // The paramters come from the named arguments in the route itself.
  export let params = {};
</script>

<Flex direction="row">
  <BackButton />
  <h3>Session Reports FOR A GAME</h3>
</Flex>

<SessionList query='/session/list?games={params.slug}&reverse' />
