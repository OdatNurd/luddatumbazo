<script>
  import { Link, Icon, LoadZone, DataTable, Th, sorts, filters } from "@axel669/zephyr";
  import { DateTime } from 'luxon';

  // ---------------------------------------------------------------------------

  // The base link to the API
  const API = `${process.env.GAME_API_ROOT_URI}/api/v1`;

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The underlying API query to use to populate the list. This should fetch a
  // data item that has a "results" key that is a list of objects with the
  // keys: ['id', 'bggId', 'slug', 'name']
  export let query = '/session/list';

  // After making the query, this function is invoked on the dataset that is
  // returned in order to filter the data set into the list of items that should
  // be displayed in the list.
  export let filter = result => result.data;

  // ---------------------------------------------------------------------------

  // The links in all of the table entries link to either sessions by ID or
  // games by their slug. These set what the URL pattern for such links looks
  // like. The placeholder is replaced in the URL when it's expanded.
  const baseLink = '#/session/:id';
  const gameLink = '#/game/:slug';

  // Using the props that we were given, generate out the kinds of links that
  // the table needs to generate both internal and external links to the data
  // that it contains.
  const session = id => baseLink.replaceAll(':id', id);
  const game = slug => gameLink.replaceAll(':slug', slug);

  // ---------------------------------------------------------------------------

  // Fetch the list of data that we need from the back end API, and return
  // the result back.
  const loadData = async () => {
    const dataURI = `${API}${query}`;

    const response = await fetch(dataURI);
    const result = await response.json();

    return filter(result);
  };
</script>


<LoadZone source={loadData()} let:result>
  <DataTable data={result} pageSize={20} color="primary">
    <svelte:fragment slot="header">
      <Th w="64px" sort={sorts.natural("id")}>ID</Th>
      <Th w="32px"></Th>
      <Th filter={filters.text("title")} sort={sorts.natural("title")}>Name</Th>
      <Th w="64px">Date</Th>
      <Th w="64px">Game</Th>
    </svelte:fragment>
    <svelte:fragment slot="row" let:row>
      <td>{row.id}</td>
      <td>
        {#if row.isLearning}
          <Icon c="&secondary" name="school"></Icon>
        {/if}
      </td>
      <td>
        {#if row.imagePath !== undefined}
          <img ws-x="p.r[4px] w[32px] h[32px]" src={row.imagePath} alt="Box art image for game {row.name}">
        {/if}
        <a href="{session(row.id)}">{row.title}</a>
      </td>
      <td>
        {DateTime.fromISO(row.sessionBegin).toLocaleString(DateTime.DATETIME_SHORT)}
      </td>
      <td>
        <Link href="{game(row.slug)}">
          <Icon name="link"></Icon>
        </Link>
      </td>
    </svelte:fragment>
  </DataTable>
</LoadZone>


<style>
  img {
    vertical-align: middle;
    object-fit: contain;
  }
</style>