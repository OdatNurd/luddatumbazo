<script>
  import { Drawer, Titlebar, Text } from "@axel669/zephyr"

  import { user } from '$stores/user';

  import DrawerLinks from '$components/drawers/DrawerLinks.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The component that opens the drawer gives us a close prop as a function
  // that we can invoke in order to close the drawer.
  export let close;

  // Export the property that allows other components to know how to cancel us.
  // The underlying modal system uses this to close us when we click outside of
  // the bounds of the drawer.
  export const cancel = () => close(null);

  // ---------------------------------------------------------------------------

  // The list of links that are available in the profile menu on the page. Items
  // with dashed labels are separators.
  const links = [
    { label: "Collection", value: "#/games/owned", requiresHousehold: true },
    { label: "Wishlist",   value: "#/games/wishlisted", requiresHousehold: true },
    { label: "---"},
    { label: "Sessions",   value: "#/sessions", requiresHousehold: false },
    { label: "---"},
    { label: `Logout ${$user.firstName}`, value: "/cdn-cgi/access/logout", requiresHousehold: false },
  ];

</script>

<Drawer type="action">
  <Titlebar slot="header">
    <Text slot="title" title>
      {$user.displayName ?? 'Unknown User'}
      {#if $user.household}
        : {$user.household?.name ?? 'Unknown Household'}
      {/if}
    </Text>
  </Titlebar>

  <DrawerLinks {close} {links} />
</Drawer>