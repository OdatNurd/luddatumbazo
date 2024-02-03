<script>
  import { wsx } from "@axel669/zephyr";
  import { LoadZone, Screen, Modal, Paper, Grid, Flex, Titlebar, Text, Link, EntryButton, Icon } from "@axel669/zephyr";

  import { user } from '$stores/user';

  import Router from 'svelte-spa-router';
  import { wrap } from 'svelte-spa-router/wrap'

  import NavDrawer from '$components/NavDrawer.svelte';
  import ProfileDrawer from '$components/ProfileDrawer.svelte';

  import Home from '$pages/Home.svelte';
  import GameList from '$pages/games/List.svelte';
  import GameDetails from '$pages/games/Details.svelte';
  import GameSessionList from '$pages/games/Sessions.svelte';

  import OwnedGameList from '$pages/games/OwnedList.svelte';
  import WishlistedGameList from '$pages/games/Wishlist.svelte';

  import SessionList from '$pages/sessions/List.svelte';
  import SessionDetails from '$pages/sessions/Details.svelte';

  import MetaList from '$pages/metadata/List.svelte';
  import MetaDetails from '$pages/metadata/Details.svelte';

  // The list of routes that control what pages in the application exist, and
  // what page fragments should be rendered when that path is active.
  const routes = {
    '/': Home,

    '/games': GameList,
    '/game/:slug': GameDetails,
    '/game/:slug/sessions': GameSessionList,

    '/games/owned': OwnedGameList,
    '/games/wishlisted': WishlistedGameList,

    '/sessions': SessionList,
    '/session/:id': SessionDetails,

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
</script>

<svelte:body use:wsx={{ "@theme": 'dark', "@app": true, "p": "8px" }} />

<Screen>
  <Paper>
    <Titlebar slot="header">
      <Flex p="0px" gap="0px" slot="title">
        <Text title> Luddatumbazo! </Text>
        <Text subtitle>Current User: {$user.displayName ?? 'Unknown'}</Text>
      </Flex>

      <EntryButton this={Modal} component={NavDrawer} m="2px" w="44px" color="@primary" slot="menu" disabled={$user.name === undefined}>
        <Icon name="dice-3-filled"></Icon>
      </EntryButton>

      <EntryButton this={Modal} component={ProfileDrawer} m="2px" w="44px" color="@primary" slot="action">
        <Icon name="user"></Icon>
      </EntryButton>
    </Titlebar>

    <Modal component={NavDrawer} />
    <Modal component={ProfileDrawer} />

    <LoadZone source={user.init()}>
      <Router {routes} />
      <svelte:fragment slot="error" let:error>
        {error}
      </svelte:fragment>
    </LoadZone>

    <Titlebar slot="footer">
      <Text slot="title" title>
        <Text subtitle>Exactly like BoardGameGeek except not.</Text>
      </Text>
    </Titlebar>
  </Paper>
</Screen>