<script>
  import IconButton from '$components/IconButton.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

</script>

<div class="back-button">
  <IconButton variant="neutral" appearance="filled" caption="" icon="arrow-left" onclick={() => window.history.back()} />
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
