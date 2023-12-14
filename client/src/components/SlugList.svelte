<script>
  import { Link, Icon, LoadZone, DataTable, Th, sorts, filters } from "@axel669/zephyr";

  // ---------------------------------------------------------------------------

  // The base link to the API
  const API = `${process.env.GAME_API_ROOT_URI}/api/v1`;

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // If an entry has a non-zero bggId, we generate a link to the appropriate BGG
  // page, and this is used in the link generation to specify where we're going.
  export let bggType = 'boardgame';

  // The slug in all table entries links to some specific page that's based on
  // the slug in question. This is the link that we will link to, where the slug
  // placeholder is replaced by the slug in the row.
  export let baseLink = '#/:slug';

  // The underlying API query to use to populate the list. This should fetch a
  // data item that has a "results" key that is a list of objects with the
  // keys: ['id', 'bggId', 'slug', 'name']
  export let query = '/game/list';

  // ---------------------------------------------------------------------------

  // Using the props that we were given, generate out the kinds of links that
  // the table needs to generate both internal and external links to the data
  // that it contains.
  const slugLink = slug => baseLink.replaceAll(':slug', slug);
  const bggLink = bggId => `https://boardgamegeek.com/${bggType}/${bggId}/`

  // ---------------------------------------------------------------------------

  // Fetch the list of data that we need from the back end API, and return
  // the result back.
  const loadData = async () => {
    const dataURI = `${API}${query}`;

    const res = await fetch(dataURI);
    return await res.json();
  };
</script>


<LoadZone source={loadData()} let:result>
  <DataTable data={result.data} pageSize={20} color="primary">
    <svelte:fragment slot="header">
      <Th w="64px" sort={sorts.natural("id")}>ID</Th>
      <Th filter={filters.text("name")} sort={sorts.natural("name")}>Name</Th>
      <Th w="64px">Ext</Th>
    </svelte:fragment>
    <svelte:fragment slot="row" let:row>
      <td>{row.id}</td>
      <td><a href="{slugLink(row.slug)}">{row.name}</a></td>
      <td>
        {#if row.bggId !== 0}
          <Link href="{bggLink(row.bggId)}" target="_blank">
            BGG <Icon name="external-link"></Icon>
          </Link>
        {:else}
          --
        {/if}
      </td>
    </svelte:fragment>
  </DataTable>
</LoadZone>
