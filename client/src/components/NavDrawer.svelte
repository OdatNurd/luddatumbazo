<script>
  import { Drawer, Titlebar, Text, Link } from "@axel669/zephyr"

  import DrawerLinks from '$components/DrawerLinks.svelte';

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

  // The list of links that are available in the main navigation menu on the
  // page. Items with dashed labels are separators.
  const links = [
    { label: "Home",            value: "#/" },
    { label: "---"},
    { label: "All Games",       value: "#/games" },
    { label: "---"},
    { label: "Categories",      value: "#/categories" },
    { label: "Mechanics",       value: "#/mechanics" },
    { label: "Designers",       value: "#/designers" },
    { label: "Artists",         value: "#/artists" },
    { label: "Publishers",      value: "#/publishers" },
    { label: "---"},
    { label: "Session Reports", value: "#/sessions" },
  ];

</script>

<Drawer>
  <Titlebar slot="header">
    <Text slot="title" title>
      Global Game Data
    </Text>
  </Titlebar>

  <DrawerLinks {close} {links} />
</Drawer>