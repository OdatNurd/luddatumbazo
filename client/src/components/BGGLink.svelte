<script>
  import { Link, Icon } from "@axel669/zephyr";

  import { pop } from 'svelte-spa-router';


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
  <Link href='https://boardgamegeek.com/{bggType}/{bggId}/' target="_blank">
    <slot>BGG</slot><Icon p.l="4px" name="box-arrow-up-right"></Icon>
  </Link>
{:else}
  <slot name="nolink">--</slot>
{/if}
