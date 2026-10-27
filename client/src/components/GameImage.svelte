<script>

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The full URL of the image to display; if this is undefined, then no image
  // will be rendered.
  export let imagePath = undefined;

  // A human readable name for this image; this is used in the alt text of the
  // image so that the Svelte compiler doesn't complain like me when I have to
  // fight with the Google assisant.
  export let name = 'unknown';

  // If true, the image is assumed to be a small icon sized version of itself;
  // otherwise, it is assumed that the image should be displayed full size.
  //
  // The main difference is that the smaller images need to have explicit width
  // and heights set so that when their aspect is not square they all display
  // with the same dimensions; this does not matter elsewhere.
  export let icon = false;

  // ---------------------------------------------------------------------------

</script>


{#if imagePath !== undefined}
  <img class:icon src={imagePath} alt="{name}">
{/if}

<style>
  img {
    vertical-align: middle;
    object-fit: contain;
    max-width: 100%;
    border-radius: var(--wa-border-radius-small);
  }

  img.icon {
    width: 32px;
    height: 32px;
    margin-right: 2px;
  }
</style>
