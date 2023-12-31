<script>
  import { wsx } from "@axel669/zephyr";
  import { Screen, Paper, Grid, Flex, Titlebar, Tabs, Text, Link, Button, Icon } from "@axel669/zephyr";

  import Router from 'svelte-spa-router';
  import { location, push } from 'svelte-spa-router'
  import { wrap } from 'svelte-spa-router/wrap'

  import Home from '$pages/Home.svelte';
  import GameList from '$pages/games/List.svelte';
  import GameDetails from '$pages/games/Details.svelte';
  import GameSessionList from '$pages/games/Sessions.svelte';

  import SessionList from '$pages/sessions/List.svelte';
  import SessionDetails from '$pages/sessions/Details.svelte';

  import MetaList from '$pages/metadata/List.svelte';
  import MetaDetails from '$pages/metadata/Details.svelte';

  // The list of tabs that are visible on the main page, and the links that they
  // correspond to. At any given point, the tab contorl can have a single value,
  // and that value represents one of the values seen in this table.
  const tabLinks = [
    { label: "Games",      value: "/games" },
    { label: "Categories", value: "/categories" },
    { label: "Mechanics",  value: "/mechanics" },
    { label: "Designers",  value: "/designers" },
    { label: "Artists",    value: "/artists" },
    { label: "Publishers", value: "/publishers" },
    { label: "Sessions",   value: "/sessions" },
  ];

  // A value from one of the tabLinks entries, which represents which of the
  // tabs in the display (if any) are currently selected. A value of undefined
  // means that no tab is selected.
  //
  // This value is automatically changed whenever the user interacts with the
  // tab.
  let tabValue = undefined;

  // The list of routes that control what pages in the application exist, and
  // what page fragments should be rendered when that path is active.
  const routes = {
    '/': Home,

    '/games': GameList,
    '/game/:slug': GameDetails,
    '/game/:slug/sessions': GameSessionList,

    '/sessions': SessionList,
    '/session/:id': SessionDetails,

    '/categories': wrap({ component: MetaList, props: { metaType: 'category'  } }),
    '/mechanics':  wrap({ component: MetaList, props: { metaType: 'mechanic'  } }),
    '/designers':  wrap({ component: MetaList, props: { metaType: 'designer'  } }),
    '/artists':    wrap({ component: MetaList, props: { metaType: 'artist'    } }),
    '/publishers': wrap({ component: MetaList, props: { metaType: 'publisher' } }),

    '/category/:slug':  wrap({ component: MetaDetails, props: { metaType: 'category',  parentLink: '/categories' } }),
    '/mechanic/:slug':  wrap({ component: MetaDetails, props: { metaType: 'mechanic',  parentLink: '/mechanics' } }),
    '/designer/:slug':  wrap({ component: MetaDetails, props: { metaType: 'designer',  parentLink: '/designers' } }),
    '/artist/:slug':    wrap({ component: MetaDetails, props: { metaType: 'artist',    parentLink: '/artists' } }),
    '/publisher/:slug': wrap({ component: MetaDetails, props: { metaType: 'publisher', parentLink: '/publishers' } }),
  };

  // Cause the router to jump directly to the root route.
  const home = () => push('/')

  $: {
    // When the value changes, go to the new location.
    if (tabValue && tabValue.startsWith('/')) {
      push(tabValue);
    }
  }
</script>

<svelte:body use:wsx={{ "$theme": 'dark', "$app": true, "p": "8px" }} />

<Screen>
  <Paper>
    <Titlebar slot="header">
      <Flex p="0px" gap="0px" slot="title">
        <Text title> Luddatumbazo! </Text>
        <Text subtitle>Exactly like BoardGameGeek except not</Text>
      </Flex>

      <Button m="2px" w="44px" outline slot="menu" on:click={home}>
        <Icon name="home"></Icon>
      </Button>

      <Link m="2px" w="44px" button outline slot="action" t.dec="none" href="/cdn-cgi/access/logout">
        <Icon name="logout"></Icon>
      </Link>
    </Titlebar>

    <Tabs options={tabLinks} solid bind:value={tabValue} color="primary" />

    <Router {routes} />

    <Titlebar slot="footer">
      <Text slot="title" title>
        <Text subtitle>Let the turds hit the floor</Text>
      </Text>
    </Titlebar>
  </Paper>
</Screen>