<script>
  import DrawerLinks from '$components/drawers/DrawerLinks.svelte';

  import { clearStack } from '$lib/router.js';
  import { user } from '$stores/user';
  import { sessionStatus } from '$stores/sessionStatus';
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

  // The Sessions shortcut is only useful once the user has some household
  // history to look back on. Hide it only after a successful status response
  // says there is none; while loading, after a failure, or when the answer is
  // unknown, fail open and keep it visible.
  $: hideSessions = $sessionStatus.loaded === true &&
    ($sessionStatus.data?.householdSessions ?? 0) === 0;

  // The list of links that this drawer shows to the user, in the order that we
  // display them. A label of "---" is a visual separator. Items marked with
  // `requiresHousehold` are only shown to users that have a household to act
  // on behalf of. Add Session is always present, even when there is no history
  // yet.
  $: links = [
    { label: "---" },
    { label: "Collection", value: "#/games/owned",      icon: "star-fill",        requiresHousehold: true },
    { label: "Wishlists",  value: "#/games/wishlisted", icon: "heart-fill",       requiresHousehold: true },
    { label: "Storage",    value: "#/storage",          icon: "box-seam",        requiresHousehold: true },
    { label: "---" },
    ...(hideSessions ? [] : [
      { label: "Sessions", value: "#/sessions",       icon: "calendar-event",   requiresHousehold: false },
    ]),
    { label: "Add Session", value: "#/sessions?add=1",  icon: "plus-lg",          requiresHousehold: false },
    { label: "---" },
    { label: `Logout ${$user.firstName ?? ''}`.trim(),  value: "/logout",         icon: "box-arrow-in-right", requiresHousehold: false, action: clearStack },
  ];
</script>

<!-- The theme switch comes first; the separator ordering of the links below
     continues the sequence (see the `links` list above). The label is just the
     toggle plus the name of the theme that is active right now. -->
<div class="theme-row">
  <wa-switch
    checked={$theme === 'dark'}
    size="s"
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
    color: var(--wa-color-text-normal);
  }
</style>
