<script>
  import { Link, Icon } from "@axel669/zephyr";

  import { LoadZone, DataTable, Th, sorts, filters } from "@axel669/zephyr";

  const API = `${process.env.GAME_API_ROOT_URI}/api/v1`;
  console.log(`Game API URI: ${API}`);

  // Waiting for Godot
  const godot = (time) => new Promise(resolve => setTimeout(resolve, time * 1000));

  // Fetch the list of games from the back end API, and return the result.
  const loadGames = async () => {
    const gameListURI = `${API}/game/meta/mechanic/list`;
    // await godot(0.25);

    const res = await fetch(gameListURI);
    return await res.json();
  };
</script>

<LoadZone source={loadGames()} let:result>
  <DataTable data={result.data} pageSize={20} color="primary">
    <svelte:fragment slot="header">
      <Th w="64px" sort={sorts.natural("id")}>ID</Th>
      <Th filter={filters.text("name")} sort={sorts.natural("name")}>Name</Th>
      <Th w="64px">Ext</Th>
    </svelte:fragment>
    <svelte:fragment slot="row" let:row>
      <td>{row.id}</td>
      <td><a href="/mechanics/{row.slug}">{row.name}</a></td>
      <td>
        {#if row.bggId !== 0}
          <Link target="_blank" href="https://boardgamegeek.com/boardgamemechanic/{row.bggId}/">
            BGG <Icon name="external-link"></Icon>
          </Link>
        {:else}
          --
        {/if}
      </td>
    </svelte:fragment>
  </DataTable>
</LoadZone>
