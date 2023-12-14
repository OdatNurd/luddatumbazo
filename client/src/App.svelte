<script>
  import { wsx } from "@axel669/zephyr";
  import { Screen, Paper, Grid, Flex, Titlebar, Tabs, Text, Link, Button, Icon } from "@axel669/zephyr";

  import Router from 'svelte-spa-router';
  import { location, push } from 'svelte-spa-router'
  import { wrap } from 'svelte-spa-router/wrap'

  import GameList from '$pages/games/List.svelte';
  import GameDetails from '$pages/games/Details.svelte';

  import MetaList from '$pages/metadata/List.svelte';
  import MetaDetails from '$pages/metadata/Details.svelte';

  const routes = {
    '/games': GameList,
    '/game/:slug': GameDetails,

    '/categories': wrap({ component: MetaList, props: { metaType: 'category'  } }),
    '/mechanics':  wrap({ component: MetaList, props: { metaType: 'mechanic'  } }),
    '/designers':  wrap({ component: MetaList, props: { metaType: 'designer'  } }),
    '/artists':    wrap({ component: MetaList, props: { metaType: 'artist'    } }),
    '/publishers': wrap({ component: MetaList, props: { metaType: 'publisher' } }),

    '/category/:slug':  wrap({ component: MetaDetails, props: { metaType: 'category'  } }),
    '/mechanic/:slug':  wrap({ component: MetaDetails, props: { metaType: 'mechanic'  } }),
    '/designer/:slug':  wrap({ component: MetaDetails, props: { metaType: 'designer'  } }),
    '/artist/:slug':    wrap({ component: MetaDetails, props: { metaType: 'artist'    } }),
    '/publisher/:slug': wrap({ component: MetaDetails, props: { metaType: 'publisher' } }),
  };

  const navLinks = [
    { label: "Games", value: "/games" },
    { label: "Categories", value: "/categories" },
    { label: "Mechanics", value: "/mechanics" },
    { label: "Designers", value: "/designers" },
    { label: "Artists", value: "/artists" },
    { label: "Publishers", value: "/publishers" },
  ];
  let value = $location;

  const homer = () => {
    value = '/';
  }

  $: {
    // When the value changes, go to the new location.
    if (value.startsWith('/')) {
      push(value);
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

      <Button outline slot="menu" on:click={homer}>
        <Icon name="home"></Icon>
      </Button>

      <Link button outline slot="action" t.dec="none" href="/cdn-cgi/access/logout">
        <Icon name="logout"></Icon>
      </Link>
    </Titlebar>

    <Tabs options={navLinks} bind:value color="primary" />

    <Router {routes}/>

    <Titlebar slot="footer">
      <Text slot="title" title>
        <Text subtitle>Let the turds hit the floor</Text>
      </Text>
    </Titlebar>
  </Paper>
</Screen>