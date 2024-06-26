<script>
  import { LoadZone, DataTable, TH, sorts, filters } from "@axel669/zephyr";


  import BGGLink from '$components/links/BGGLink.svelte';
  import GameImage from '$components/GameImage.svelte';

  import { api } from '$api';

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

  // A key that is provided to the provided loader, to control what it does.
  export let loaderKey = undefined;

  // We can be used to gather session data in a variety of different ways. The
  // component accepts an async callback that is responsible for gathering the
  // data.
  //
  // The result of the callback should be a promise that resolves to an array of
  // short session objects.
  export let loader = async () => [];

  // After making the query, this function is invoked on the dataset that is
  // returned in order to filter the data set into the list of items that should
  // be displayed in the list.
  export let filter = result => result;

  // ---------------------------------------------------------------------------

  // Using the props that we were given, generate out the kinds of links that
  // the table needs to generate internal links to the data that it contains.
  const slugLink = slug => baseLink.replaceAll(':slug', slug);

  // ---------------------------------------------------------------------------

  // Fetch the list of data that we need from the back end API, and return
  // the result back after filtering it.
  const loadData = async param => filter (await loader(param));
</script>


<LoadZone source={loadData(loaderKey)} let:result>
  <DataTable data={result} pageSize={20} color="@primary">
    <svelte:fragment slot="header">
      <TH w="64px" sort={sorts.natural("id")}>ID</TH>
      <TH filter={filters.text("name")} sort={sorts.natural("name")}>Name</TH>
      <TH w="64px">Ext</TH>
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

  <svelte:fragment slot="error" let:error>
    {error}
  </svelte:fragment>
</LoadZone>
