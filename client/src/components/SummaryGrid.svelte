<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The smallest width a card may take before the grid wraps to another column.
  // Pages can override it, but the default keeps the existing cards'
  // comfortable phone/tablet behavior.
  export let min = '150px';

  // When false, a parent `.stack` owns the vertical rhythm. Sessions Details
  // uses this because its summary sits inside a gap-based stack.
  export let spaced = true;

  // ---------------------------------------------------------------------------
</script>


<div class="summary-grid" class:spaced style={`--summary-min: ${min};`}>
  <slot />
</div>


<style>
  .summary-grid {
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
