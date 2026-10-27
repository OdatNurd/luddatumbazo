<script>
  import DrawerLinks from '$components/drawers/DrawerLinks.svelte';

  import { user } from '$stores/user';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Invoked when a navigation link is taken, so the host can close the drawer
  // that displays us.
  export let close = () => {};

  // The list of links that are available in the profile menu on the page. Items
  // with dashed labels are separators.
  //
  // This is a reactive statement so that labels which embed user details (such
  // as the logout link) update once the user data has actually loaded.
  $: links = [
    { label: "Collection", value: "#/games/owned",      icon: "star-fill",  requiresHousehold: true },
    { label: "Wishlist",   value: "#/games/wishlisted", icon: "heart-fill", requiresHousehold: true },
    { label: "---" },
    { label: "Sessions",   value: "#/sessions",         icon: "calendar-event", requiresHousehold: false },
    { label: "---" },
    { label: `Logout ${$user.firstName ?? ''}`.trim(), value: "/logout", icon: "box-arrow-in-right", requiresHousehold: false },
  ];
</script>

<DrawerLinks {close} {links} />
