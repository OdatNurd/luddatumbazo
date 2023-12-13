<script>
  import { wsx } from "@axel669/zephyr";
  import { Screen, Paper, Grid, Flex, Titlebar, Text, Link, Icon } from "@axel669/zephyr";

  import { LoadZone, DataTable, Th, sorts, filters } from "@axel669/zephyr";

  const API = `${process.env.GAME_API_ROOT_URI}/api/v1`;
  console.log(`Game API URI: ${API}`);

  // Waiting for Godot
  const godot = (time) => new Promise(resolve => setTimeout(resolve, time * 1000));

  // Fetch the list of games from the back end API, and return the result.
  const loadGames = async () => {
    const gameListURI = `${API}/game/list`;
    await godot(0.5);

    const res = await fetch(gameListURI);
    return await res.json();
  };

</script>

<svelte:body use:wsx={{ "$theme": 'dark', "$app": true, "p": "8px" }} />

<Screen>
  <Paper>
    <Titlebar slot="header">
      <Flex p="0px" gap="0px" slot="title">
        <Text title> Luddatumbazo! </Text>
        <Text subtitle>Exactly like BoardGameGeek except not</Text>
      </Flex>

      <Link button outline slot="action" t.dec="none" href="/cdn-cgi/access/logout">
        <Icon name="logout"></Icon>
      </Link>
    </Titlebar>


    <LoadZone source={loadGames()} let:result>
      <DataTable data={result.data} pageSize={20} color="primary">
        <svelte:fragment slot="header">
          <Th w="64px" sort={sorts.natural("id")}>ID</Th>
          <Th filter={filters.text("name")} sort={sorts.natural("name")}>Name</Th>
          <Th w="64px">Ext</Th>
        </svelte:fragment>
        <svelte:fragment slot="row" let:row>
          <td>{row.id}</td>
          <td><a href="/games/{row.slug}">{row.name}</a></td>
          <td>
            {#if row.bggId !== 0}
              <Link target="_blank" href="https://boardgamegeek.com/boardgame/{row.bggId}/">
                BGG <Icon name="external-link"></Icon>
              </Link>
            {:else}
              --
            {/if}
          </td>
        </svelte:fragment>
      </DataTable>
    </LoadZone>

<!--
    <Grid>
       <ul>
        <li>The overall list of games</li>
        <li>The overall list of metadata X/5</li>
        <li>Details on a specific game</li>
        <li>All games matching metadata X/5</li>
      </ul>
    </Grid>
 -->


    <Titlebar slot="footer">
      <Text slot="title" title>
        <Text subtitle>Let the turds hit the floor</Text>
      </Text>
    </Titlebar>
  </Paper>
</Screen>