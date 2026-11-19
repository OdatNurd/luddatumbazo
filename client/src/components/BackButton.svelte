<script>
  import IconButton from '$components/IconButton.svelte';

  import { back } from '$lib/router.js';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The route to fall back on when the app has no recorded trail to retrace
  // (a cold deep link, say); the natural parent list of the page.
  export let to = '/'

  // The accessible name of the icon-only control; callers can name a more
  // specific destination, but every back button is named by default.
  export let label = 'Back';

</script>

<div class="back-button">
  <IconButton variant="neutral" appearance="filled" caption="" icon="arrow-left" {label}
             onclick={() => back(to)} />
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
