<script>
  import DataGrid from '$components/DataGrid.svelte';

  import * as cells from '$lib/cells.js';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The list of items to display in the list; this can be undefined, in which
  // case the component displays nothing.
  export let data = undefined;

  // The title for the table
  export let title = undefined;

  // The number of expansions to display per page
  export let pageSize = 5;

  // ---------------------------------------------------------------------------

  // Generate a link to the game with the provided slug
  const slugLink = slug => '#/game/:slug'.replaceAll(':slug', slug);

  // The columns of the grid; the name links to the game when the expansion has
  // its own page, and the external column links to BoardGameGeek.
  const columns = [
    {
      field: 'id',
      label: 'ID',
      width: 72,
      sortFn: 'alphanumeric',
      formatter: (value) => value ?? '--'
    },
    {
      field: 'name',
      label: 'Name',
      filterable: true,
      filterType: 'text',
      flex: 1,
      formatter: (value, row) => (row.slug !== null && row.slug !== undefined)
        ? cells.link(slugLink(row.slug), row.name)
        : cells.text(row.name)
    },
    {
      field: 'bggId',
      label: 'Ext',
      width: 80,
      align: 'center',
      sortable: false,
      formatter: (value) => (value === 0 || value === null || value === undefined)
        ? '--'
        : cells.link(`https://boardgamegeek.com/boardgame/${value}/`, 'BGG', { external: true, icon: 'box-arrow-up-right' })
    }
  ];

</script>


<!-- *********************************************************************** -->


<h4>{title ?? 'Unknown'}</h4>
{#if data.length === 0}
  <div class="muted">No entries</div>
{:else}
  <DataGrid {data} {columns} pageSize={Math.min(Math.max(data.length, 1), pageSize)} />
{/if}


<!-- *********************************************************************** -->
