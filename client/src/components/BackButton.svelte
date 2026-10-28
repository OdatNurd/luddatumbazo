<script>
  import IconButton from '$components/IconButton.svelte';

  import { back } from '$lib/router.js';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The route to fall back on when the app has no recorded trail to retrace
  // (a cold deep link, say); the natural parent list of the page.
  export let to = '/'

</script>

<div class="back-button">
  <IconButton variant="neutral" appearance="filled" caption="" icon="arrow-left" onclick={() => back(to)} />
  <slot />
</div>

<style>
  .back-button {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
</style>
