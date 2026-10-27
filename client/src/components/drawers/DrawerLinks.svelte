<script>
  import Icon from '$components/Icon.svelte';

  import { user } from '$stores/user';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The function that can be invoked to close the menu that contains us.
  export let close = () => {};

  // The list of navigation links. This is an array of objects that have "label"
  // and "value" arguments that specify where the navigation links should go,
  // and what text to display.
  //
  // An optional "icon" names a bootstrap icon glyph to lead with.
  //
  // A label that is three dashes is output as a separator.
  export let links;

  // ---------------------------------------------------------------------------

  // Check if a link should be disabled; disable any link that requires a
  // household if the given user does not have one.
  //
  // The user is passed in from the template rather than read from the store
  // here, so that every use of this helper is a real dependency on the store
  // and re-renders when the user data arrives.
  const disabled = (link, current) => link.requiresHousehold === true ? !(current.household) : false;
</script>

{#each links as link (link)}
  {#if link.label === '---'}
    <hr class="nav-separator" />
  {:else if disabled(link, $user)}
    <span class="nav-link nav-link-disabled">
      {#if link.icon}<Icon name={link.icon} padRight="8px"></Icon>{/if}
      {link.label}
    </span>
  {:else}
    <a class="nav-link" href={link.value} on:click={close}>
      {#if link.icon}<Icon name={link.icon} padRight="8px"></Icon>{/if}
      {link.label}
    </a>
  {/if}
{/each}

<style>
  .nav-link {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: var(--wa-border-radius-medium);
    color: var(--wa-color-text-body);
    text-decoration: none;
    transition: background var(--wa-transition-normal);
  }

  .nav-link:hover {
    background: var(--wa-color-surface-background-hover);
    text-decoration: none;
  }

  .nav-link-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* The rule is mixed from the current text color rather than taken from the
   * theme's surface border token: on the drawer's raised surface that token is
   * the same colour as the background in the dark scheme, which made the
   * separators vanish there. Mixing with currentColor keeps the hairline at a
   * constant contrast against whatever surface it sits on, in both schemes. */
  .nav-separator {
    width: 64px;
    margin: 12px 0;
    border: none;
    border-top: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  }
</style>
