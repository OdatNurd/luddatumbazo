<script>
  import { Drawer, Titlebar, Flex, Text } from "@axel669/zephyr"

  import { server } from '$stores/server';

  import DrawerLinks from '$components/drawers/DrawerLinks.svelte';
  import GitCommitLink from '$components/links/GitCommitLink.svelte';

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
    { label: "Games",       value: "#/games" },
    { label: "---"},
    { label: "Categories",      value: "#/categories" },
    { label: "Mechanics",       value: "#/mechanics" },
    { label: "Designers",       value: "#/designers" },
    { label: "Artists",         value: "#/artists" },
    { label: "Publishers",      value: "#/publishers" },
    { label: "---"},
    { label: "Sessions", value: "#/sessions" },
  ];

  // Gather the commit that it used for the UI release
  export const uiCommit = process.env.UI_RELEASE_COMMIT;
</script>

<Drawer>
  <Titlebar slot="header">
    <Text slot="title" title>
      Main Menu
    </Text>
  </Titlebar>

  <DrawerLinks {close} {links} />

  <Titlebar slot="footer">
    <Text slot="title" title>
      <Flex direction="row">
        <Text subtitle> UI: </Text>
        <Text subtitle> <GitCommitLink commit={uiCommit} /> </Text>
      </Flex>
      {#if $server.commit !== undefined }
        <Flex direction="row">
          <Text subtitle> API: </Text>
          <Text subtitle> <GitCommitLink commit={$server.commit} /> </Text>
        </Flex>
      {/if}
    </Text>
  </Titlebar>
</Drawer>
