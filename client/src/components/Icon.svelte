<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The name of the icon; names resolve through the local bootstrap icon
  // library (the same names the zephyr UI used).
  export let name = 'question-circle-fill';

  // Optional size for the glyph, as a CSS length.
  export let size = undefined;

  // Optional CSS color for the glyph.
  export let color = undefined;

  // Optional padding on either side, as CSS lengths; the old UI spaced its
  // inline icons this way and the call sites carry the same shapes.
  export let padLeft = undefined;
  export let padRight = undefined;

  // ---------------------------------------------------------------------------

  // Assemble the inline style from whichever of the appearance props are set.
  $: style = [
    size !== undefined && `font-size:${size}`,
    color !== undefined && `color:${color}`,
    padLeft !== undefined && `padding-left:${padLeft}`,
    padRight !== undefined && `padding-right:${padRight}`
  ].filter(Boolean).join(';');
</script>

<wa-icon library="bootstrap" {name} {style}></wa-icon>
