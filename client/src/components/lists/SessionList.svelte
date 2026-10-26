<script>
  import { DateTime } from 'luxon';

  import LoadZone from '$components/LoadZone.svelte';
  import DataGrid from '$components/DataGrid.svelte';

  import { server } from '$stores/server';

  import * as cells from '$lib/cells.js';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // We can be used to gather session data in a variety of different ways. The
  // component accepts an async callback that is responsible for gathering the
  // data.
  //
  // The result of the callback should be a promise that resolves to an array of
  // short session objects.
  export let loader = async () => [];

  // When this property is true, the table displays an extra column that has a
  // link to the game that the session is for.
  export let showGames = true;

  // Set the number of rows that are visible in the data table per page
  export let pageSize = 20;

  // Passed through to the grid so that the user's page size choice is
  // remembered across visits; only the top level session list provides one.
  export let gridKey = undefined;

  // When this list is the whole page body, set this so the grid fills whatever
  // vertical space the shell leaves for it instead of the page scrolling.
  export let fill = false;

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

  // The columns of the session grid. The icon columns present the game type of
  // the session and whether it was a learning game, the name links to the
  // session report, and (optionally) the game column links to the game the
  // session was for.
  const columns = [
    {
      field: 'id',
      label: 'ID',
      width: 72,
      sortFn: 'alphanumeric'
    },
    {
      id: 'playType',
      field: 'playType',
      label: '',
      width: 40,
      align: 'center',
      sortable: false,
      formatter: (value) => {
        const glyph = cells.icon(server.gameTypeIcon(value), { color: 'var(--wa-color-brand-600)' });
        glyph.setAttribute('title', server.gameTypeName(value));
        return glyph;
      }
    },
    {
      id: 'learning',
      field: 'isLearning',
      label: '',
      width: 40,
      align: 'center',
      sortable: false,
      formatter: (value) => value
        ? (() => { const glyph = cells.icon('mortarboard-fill', { color: 'var(--wa-color-warning-600)' }); glyph.setAttribute('title', 'Learning game'); return glyph; })()
        : ''
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
      field: 'title',
      label: 'Name',
      filterable: true,
      filterType: 'text',
      flex: 1,
      formatter: (value, row) => cells.link(session(row.id), value)
    },
    {
      field: 'sessionBegin',
      label: 'Date',
      width: 160,
      sortFn: 'datetime',
      formatter: (value) => cells.text(DateTime.fromISO(value).toLocaleString(DateTime.DATETIME_SHORT))
    }
  ];

  // The optional trailing column that links to the game for the session.
  const gameColumn = {
    id: 'game',
    label: 'Game',
    width: 72,
    align: 'center',
    sortable: false,
    formatter: (value, row) => cells.link(game(row.slug), '', { icon: 'link-45deg' })
  };

  // Assemble the actual column list based on whether game links should show.
  $: gridColumns = (showGames === true) ? [...columns, gameColumn] : columns;

</script>


<LoadZone source={loader()} let:result>
  <DataGrid data={result} columns={gridColumns} {fill} {gridKey} pageSize={showGames ? pageSize : Math.min(Math.max(result.length, 1), pageSize)}>
    <slot name="actions" slot="actions" />
  </DataGrid>

  <svelte:fragment slot="error" let:error>
    {error}
  </svelte:fragment>
</LoadZone>
