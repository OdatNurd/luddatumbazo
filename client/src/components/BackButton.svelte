<script>
  import IconButton from '$components/IconButton.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

</script>

<div class="back-button">
  <IconButton fill color="@secondary" caption="" icon="arrow-left" on:click={() => window.history.back()} />
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
