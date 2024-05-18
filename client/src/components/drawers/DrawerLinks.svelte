<script>
  import { Link } from "@axel669/zephyr"

  import { user } from '$stores/user';

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

  // Check if a link should be disabled; disable any link that requires a
  // household if there is not a household on the current user.
  const disabled = link => link.requiresHousehold === true ? !($user.household) : false;
</script>

{#each links as link (link.value) }
  {#if link.label === '---'}
    <hr />
  {:else}
    <Link disabled={disabled(link)} href={link.value} button outline on:click={close}>{link.label}</Link>
  {/if}
{/each}


<style>
  hr {
    width: 64px;
    margin-top: 16px;
    margin-bottom: 16px;
  }
</style>