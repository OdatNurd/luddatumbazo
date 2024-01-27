<script>
  import { Link, Icon, LoadZone, DataTable, Th, sorts, filters } from "@axel669/zephyr";


  import BGGLink from '$components/BGGLink.svelte';
  import GameImage from '$components/GameImage.svelte';

  import { api } from '$lib/fetch.js';

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

  // After making the query, this function is invoked on the dataset that is
  // returned in order to filter the data set into the list of items that should
  // be displayed in the list.
  export let filter = result => result.data;

  // ---------------------------------------------------------------------------

  // Using the props that we were given, generate out the kinds of links that
  // the table needs to generate internal links to the data that it contains.
  const slugLink = slug => baseLink.replaceAll(':slug', slug);

  // ---------------------------------------------------------------------------

  // Fetch the list of data that we need from the back end API, and return
  // the result back.
  const loadData = async () => {
    const response = await api(query);
    const result = await response.json();

    return filter(result);
  };
</script>


<LoadZone source={loadData()} let:result>
  <DataTable data={result} pageSize={20} color="primary">
    <svelte:fragment slot="header">
      <Th w="64px" sort={sorts.natural("id")}>ID</Th>
      <Th filter={filters.text("name")} sort={sorts.natural("name")}>Name</Th>
      <Th w="64px">Ext</Th>
    </svelte:fragment>
    <svelte:fragment slot="row" let:row>
      <td>{row.id}</td>
      <td>
        <GameImage imagePath={row.imagePath} name={row.name} icon={true} />
        <a href="{slugLink(row.slug)}">{row.name}</a>
      </td>
      <td>
        <BGGLink {bggType} bggId={row.bggId} />
      </td>
    </svelte:fragment>
  </DataTable>
</LoadZone>
