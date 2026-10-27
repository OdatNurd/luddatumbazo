<script>
  import Icon from '$components/Icon.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The BGG ID of the link to generate; when this is 0, no link will be
  // generated
  export let bggId = 0;

  // When generating a link, this specifies what type of object the bggId
  // property represents; it's used to construct an appropriate link.
  export let bggType = 'boardgame';

  // ---------------------------------------------------------------------------

</script>


{#if bggId !== 0}
  <a href='https://boardgamegeek.com/{bggType}/{bggId}/' target="_blank" rel="noreferrer">
    <slot>BGG</slot><Icon padLeft="4px" name="box-arrow-up-right"></Icon>
  </a>
{:else}
  <slot name="nolink">--</slot>
{/if}
