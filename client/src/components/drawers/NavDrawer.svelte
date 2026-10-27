<script>
  import DrawerLinks from '$components/drawers/DrawerLinks.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Invoked when a navigation link is taken, so the host can collapse any
  // mobile navigation drawer it is displayed in.
  export let close = () => {};

  // The list of links that are available in the main navigation menu on the
  // page. Items with dashed labels are separators.
  const links = [
    { label: "Home",        value: "#/",           icon: "dice-3-fill" },
    { label: "Games",       value: "#/games",      icon: "collection" },
    { label: "Sessions",    value: "#/sessions",   icon: "calendar-event" },
    { label: "---" },
    { label: "Categories",  value: "#/categories", icon: "bookmark-star-fill" },
    { label: "Mechanics",   value: "#/mechanics",  icon: "gear-fill" },
    { label: "Designers",   value: "#/designers",  icon: "pencil-fill" },
    { label: "Artists",     value: "#/artists",    icon: "card-image" },
    { label: "Publishers",  value: "#/publishers", icon: "box" },
  ];
</script>

<DrawerLinks {close} {links} />
