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

  // Control Windstorm attributes based on wether or not the image is an icon
  // or not.
  const wsx = (icon === false) ? null : "[p.r 2px] [w 32px] [h 32px]";
</script>


{#if imagePath !== undefined}
  <img ws-x={wsx} src={imagePath} alt="{name}">
{/if}

<style>
  img {
    vertical-align: middle;
    object-fit: contain;
  }
</style>
