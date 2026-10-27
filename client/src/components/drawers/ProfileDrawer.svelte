<script>
  import DrawerLinks from '$components/drawers/DrawerLinks.svelte';

  import { user } from '$stores/user';
  import { theme } from '$stores/theme';

  // -----------------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------------

  // Invoked when a navigation link is taken, so the host can close the drawer
  // that displays us.
  export let close = () => {};

  // -----------------------------------------------------------------------

  // The theme switch is the drawer's first item; it mirrors the current scheme
  // and pushes any change back into the theme store. Its label names the theme
  // that is currently selected, so it flips along with the toggle.
  const setTheme = (event) => theme.select(event.target.checked === true ? 'dark' : 'light');

  // The list of links that this drawer shows to the user, in the order that we
  // display them. A label of "---" is a visual separator. Items marked with
  // `requiresHousehold` are only shown to users that have a household to act
  // on behalf of.
  $: links = [
    { label: "---" },
    { label: "Collection", value: "#/games/owned",      icon: "star-fill",        requiresHousehold: true },
    { label: "Wishlists",  value: "#/games/wishlisted", icon: "heart-fill",       requiresHousehold: true },
    { label: "---" },
    { label: "Sessions",   value: "#/sessions",         icon: "calendar-event",   requiresHousehold: false },
    { label: "---" },
    { label: `Logout ${$user.firstName ?? ''}`.trim(),  value: "/logout",         icon: "box-arrow-in-right", requiresHousehold: false },
  ];
</script>

<!-- The theme switch comes first; the separator ordering of the links below
     continues the sequence (see the `links` list above). The label is just the
     toggle plus the name of the theme that is active right now. -->
<div class="theme-row">
  <wa-switch
    checked={$theme === 'dark'}
    size="small"
    on:change={setTheme}
  >{$theme === 'dark' ? 'Dark mode' : 'Light mode'}</wa-switch>
</div>

<DrawerLinks {close} {links} />

<style>
  .theme-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    color: var(--wa-color-text-body);
  }
</style>
