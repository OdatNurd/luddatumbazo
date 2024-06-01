<script>
  import { wsx } from "@axel669/zephyr";
  import { LoadZone, Screen, Modal, Paper, Grid, Flex, Titlebar, Text, Link, EntryButton, Icon } from "@axel669/zephyr";

  import { user } from '$stores/user';
  import { server } from '$stores/server';
  import { wishlists } from '$stores/wishlists';

  import Router from 'svelte-spa-router';
  import { wrap } from 'svelte-spa-router/wrap'

  import NavDrawer from '$components/drawers/NavDrawer.svelte';
  import ProfileDrawer from '$components/drawers/ProfileDrawer.svelte';

  import Home from '$pages/Home.svelte';
  import GameList from '$pages/games/List.svelte';
  import GameDetails from '$pages/games/Details.svelte';

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

    '/games/owned': OwnedGameList,
    '/games/wishlisted/:wishlist?': WishlistedGameList,

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

  // Initiwlize all of the stores that start with data from a default query.
  const init = async () => {
    // Get information on the current user and the server
    await Promise.all([user.init(), server.init()]);

    // Using the loaded data for the user, if they have a household also load
    // the list of wishlists.
    if ($user.household) {
      await wishlists.init($user.household);
    }
  }
</script>

<svelte:body use:wsx={{ "@theme": 'dark', "@app": true, "p": "8px" }} />

<Screen>
  <Paper>
    <Titlebar slot="header">
      <Flex p="0px" gap="0px" slot="title">
        <Text title> Luddatumbazo! </Text>
        <Text subtitle>
          Current User: {$user.displayName ?? 'Unknown'}
          {#if $user.household !== null}
            , Household: {$user.household?.name ?? 'Unknown'}
          {/if}
        </Text>
      </Flex>

      <EntryButton this={Modal} component={NavDrawer} m="2px" w="44px" color="@primary" slot="menu" disabled={$user.name === undefined}>
        <Icon name="dice-3-fill"></Icon>
      </EntryButton>

      <EntryButton this={Modal} component={ProfileDrawer} m="2px" w="44px" color="@primary" slot="action">
        <Icon name="person-fill"></Icon>
      </EntryButton>
    </Titlebar>

    <Modal component={NavDrawer} />
    <Modal component={ProfileDrawer} />

    <LoadZone source={init()}>
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