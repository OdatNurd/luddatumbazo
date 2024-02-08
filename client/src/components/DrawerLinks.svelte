<script>
  import { Link } from "@axel669/zephyr"

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The function that can be invoked in order to close the menu.
  export let close;

  // The list of navigation links. This is an array of objects that have
  // "label" and "value" arguments that specify where the navigation links
  // should go, and what text to display.
  //
  // A label that is three dashes is output as a separator.
  export let links;

  // ---------------------------------------------------------------------------

</script>

{#each links as link (link.value) }
  {#if link.label === '---'}
    <hr />
  {:else}
    <Link href={link.value} button outline on:click={close}>{link.label}</Link>
  {/if}
{/each}


<style>
  hr {
    width: 64px;
    margin-top: 16px;
    margin-bottom: 16px;
  }
</style>