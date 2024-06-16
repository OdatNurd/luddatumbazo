<script>
  import { wsx } from "@axel669/zephyr";
  import { LoadZone, Route, Screen, Modal, Paper, Grid, Flex, Titlebar, Text, Link, EntryButton, Icon } from "@axel669/zephyr";

  import { user } from '$stores/user';
  import { server } from '$stores/server';
  import { wishlists } from '$stores/wishlists';

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

  // Initialize all of the stores that start with data from a default query.
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

<svelte:body use:wsx={{ "@@theme": 'dark', "@@app": true, "p": "8px" }} />

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
      <Route path="/" component={Home} exact={true} />

      <Route path="games" component={GameList} exact={true} />
      <Route path="game/:slug" component={GameDetails} />

      <Route path="games/owned" component={OwnedGameList} />
      <Route path="games/wishlisted" component={WishlistedGameList} exact={true} />
      <Route path="games/wishlisted/:wishlist" component={WishlistedGameList} />

      <Route path="sessions" component={SessionList} />
      <Route path="session/:id" component={SessionDetails} />

      <Route path="categories" component={MetaList} props={ { metaType: "category" } } />
      <Route path="mechanics" component={MetaList} props={ { metaType: "mechanic" } } />
      <Route path="designers" component={MetaList} props={ { metaType: "designer" } } />
      <Route path="artists" component={MetaList} props={ { metaType: "artist" } } />
      <Route path="publishers" component={MetaList} props={ { metaType: "publisher" } } />

      <Route path="category/:slug" component={MetaDetails} props={ { metaType: "category" } } />
      <Route path="mechanic/:slug" component={MetaDetails} props={ { metaType: "mechanic" } } />
      <Route path="designer/:slug" component={MetaDetails} props={ { metaType: "designer" } } />
      <Route path="artist/:slug" component={MetaDetails} props={ { metaType: "artist" } } />
      <Route path="publisher/:slug" component={MetaDetails} props={ { metaType: "publisher" } } />

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