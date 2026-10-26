<script>
  import LoadZone from '$components/LoadZone.svelte';
  import DataGrid from '$components/DataGrid.svelte';

  import * as cells from '$lib/cells.js';

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

  // Passed through to the grid so that the user's page size choice for this
  // list is remembered across visits; only the top level pages provide one.
  export let gridKey = undefined;

  // ---------------------------------------------------------------------------

  // Using the props that we were given, generate out the kinds of links that
  // the table needs to generate internal links to the data that it contains.
  const slugLink = slug => baseLink.replaceAll(':slug', slug);

  // ---------------------------------------------------------------------------

  // The columns of the grid; name links to the entry and, when the entry has a
  // BGG id, the external column links to BoardGameGeek.
  const columns = [
    {
      field: 'id',
      label: 'ID',
      width: 72,
      sortFn: 'alphanumeric'
    },
    {
      // The cell shows a picture; its underlying URL is not searchable text.
      // (Every image URL contains the image account name, so leaving this
      // searchable makes common substrings match every row in the grid.)
      field: 'imagePath',
      label: '',
      width: 56,
      align: 'center',
      sortable: false,
      searchable: false,
      formatter: (value, row) => cells.image(value, row)
    },
    {
      field: 'name',
      label: 'Name',
      filterable: true,
      filterType: 'text',
      flex: 1,
      formatter: (value, row) => cells.link(slugLink(row.slug), value)
    },
    {
      field: 'bggId',
      label: 'Ext',
      width: 80,
      align: 'center',
      sortable: false,
      formatter: (value) => (value === 0 || value === null || value === undefined)
        ? '--'
        : cells.link(`https://boardgamegeek.com/${bggType}/${value}/`, 'BGG', { external: true, icon: 'box-arrow-up-right' })
    }
  ];

  // Fetch the list of data that we need from the back end API, and return
  // the result back after filtering it. The tick argument exists only to make
  // the expression below depend on it so that refresh() re-runs the load.
  const loadData = async (param, tick) => filter (await loader(param));

  // Re-run the load after something has changed the underlying data (such as
  // the add dialog creating a record). The grid stays mounted, so its sort,
  // page and search state survive the refresh.
  let tick = 0;

  export function refresh() {
    tick += 1;
  }
</script>


<LoadZone source={loadData(loaderKey, tick)} let:result>
  <!-- This list is always presented as the whole page body, so the grid fills
       whatever vertical space the shell leaves for it (see app.css). -->
  <DataGrid data={result} {columns} {gridKey} fill>
    <slot name="actions" slot="actions" />
  </DataGrid>

  <svelte:fragment slot="error" let:error>
    {error}
  </svelte:fragment>
</LoadZone>
