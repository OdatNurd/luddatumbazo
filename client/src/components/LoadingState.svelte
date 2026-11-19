<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The name announced to assistive technology while the spinner is showing.
  // The spinner draws no text of its own, so the wrapper carries the state.
  export let label = 'Loading';
</script>


<div class="loading-state" role="status">
  <wa-spinner></wa-spinner>
  <span class="wa-visually-hidden">{label}</span>
</div>


<style>
  .loading-state {
    display: flex;
    justify-content: center;
    padding: 24px;
  }
</style>
