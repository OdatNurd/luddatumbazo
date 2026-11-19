<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The smallest width a card may take before the grid wraps to another
  // column. The default lives in CSS so the compact breakpoint can lower it;
  // a page that passes min explicitly still wins with an inline custom
  // property.
  export let min = undefined;

  // When false, a parent `.stack` owns the vertical rhythm. Sessions Details
  // uses this because its summary sits inside a gap-based stack.
  export let spaced = true;

  // ---------------------------------------------------------------------------
</script>


<div class="summary-grid" class:spaced
     style={min === undefined ? undefined : `--summary-min: ${min};`}>
  <slot />
</div>


<style>
  .summary-grid {
    --summary-min: var(--app-summary-min, 150px);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(var(--summary-min), 1fr));
    gap: var(--app-summary-gap);
  }

  .summary-grid.spaced {
    margin-bottom: var(--app-page-head-margin);
  }

  @media (max-width: 480px) {
    .summary-grid {
      --summary-min: 130px;
    }
  }
</style>
