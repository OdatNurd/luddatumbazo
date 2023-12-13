<script>
  import { wsx } from "@axel669/zephyr";
  import { Screen, Paper, Grid, Flex, Titlebar, Text, Link, Icon } from "@axel669/zephyr";

  import Router from 'svelte-spa-router';
  import {location} from 'svelte-spa-router'

  import GameList from './pages/games/List.svelte';
  import CategoryList from './pages/metadata/CategoryList.svelte';
  import MechanicList from './pages/metadata/MechanicList.svelte';
  import DesignerList from './pages/metadata/DesignerList.svelte';
  import ArtistList from './pages/metadata/ArtistList.svelte';
  import Publisherst from './pages/metadata/PublisherList.svelte';

  const routes = {
    // Exact path
    '/games': GameList,
    '/categories': CategoryList,
    '/mechanics': MechanicList,
    '/designers': DesignerList,
    '/artists': ArtistList,
    '/publishers': Publisherst,
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

      <Link button outline slot="menu" t.dec="none" href="#/">
        <Icon name="home"></Icon>
      </Link>

      <Link button outline slot="action" t.dec="none" href="/cdn-cgi/access/logout">
        <Icon name="logout"></Icon>
      </Link>
    </Titlebar>

    <Flex direction="row">
      <Link href="#/games">Games</Link>
      <Link href="#/categories">Categories</Link>
      <Link href="#/mechanics">Mechanics</Link>
      <Link href="#/designers">Designers</Link>
      <Link href="#/artists">Artists</Link>
      <Link href="#/publishers">Publishers</Link>
    </Flex>

    <Router {routes}/>

    <Titlebar slot="footer">
      <Text slot="title" title>
        <Text subtitle>Let the turds hit the floor</Text>
      </Text>
    </Titlebar>
  </Paper>
</Screen>