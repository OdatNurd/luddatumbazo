<script>
  import { DateTime, Interval } from 'luxon';

  import { api } from '$api';
  import { server } from '$stores/server';

  import LoadZone from '$components/LoadZone.svelte';
  import DataGrid from '$components/DataGrid.svelte';
  import BackButton from '$components/BackButton.svelte';
  import BGGLink from '$components/links/BGGLink.svelte';
  import GameImage from '$components/GameImage.svelte';

  import * as cells from '$lib/cells.js';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Receive paramters from the URL route that landed us on this page; this
  // will contain the slug that we need in order to display the details pane.
  // The paramters come from the named arguments in the route itself.
  export let routeInfo = {};

  // ---------------------------------------------------------------------------


  // Default to an empty game and a session title that is the id paramter;
  // these will be laoded when the session loads.
  // Default the name on the page to the sessionId that was used to load it,
  // until the data is fully loaded.
  let name = 'Unknown';
  let slug = 'unknown';
  let title = routeInfo.params.id;

  // Using the props that we were given, generate out the kinds of links that
  // the table needs to generate internal links to the data that it contains.
  const slugLink = slug => '#/game/:slug'.replaceAll(':slug', slug);

  // Fetch the list of data that we need from the back end API, and return
  // the result back.
  const loadData = async () => {
    const result = await api.session.details(routeInfo.params.id);

    name = result.name;
    slug = result.slug;
    title = result.title;

    // Convert the incoming session begin and end into DateTime for easier
    // handling.
    const begin = DateTime.fromISO(result.sessionBegin);
    const end   = DateTime.fromISO(result.sessionEnd);

    // Calculate the duration; we want this to be in minutes unless the game
    // look at least an hour
    let duration = Interval.fromDateTimes(begin, end).toDuration(['minutes']);
    if (duration.minutes > 60) {
      duration = duration.shiftTo('hours', 'minutes');
    }

    // Store back now
    result.sessionBegin = begin
    result.sessionEnd = end
    result.sessionDuration = duration;

    return result;
  };

  // The columns of the players grid; the flag and trophy glyph columns mark the
  // starting player and the winner of the session.
  const playerColumns = [
    {
      field: 'userId',
      label: 'ID',
      width: 128,
      sortFn: 'alphanumeric'
    },
    {
      id: 'starting',
      field: 'isStartingPlayer',
      label: '',
      width: 40,
      align: 'center',
      sortable: false,
      formatter: (value) => value
        ? cells.icon('flag-fill', { color: 'var(--wa-color-brand-600)' })
        : ''
    },
    {
      id: 'winner',
      field: 'isWinner',
      label: '',
      width: 40,
      align: 'center',
      sortable: false,
      formatter: (value) => value
        ? cells.icon('trophy-fill', { color: 'var(--wa-color-warning-600)' })
        : ''
    },
    {
      field: 'name',
      label: 'Name',
      filterable: true,
      filterType: 'text',
      flex: 1
    },
    {
      field: 'score',
      label: 'Score',
      width: 96,
      align: 'end',
      sortFn: 'basic'
    }
  ];

  // The columns of the expansions grid; the name links to the expansion's own
  // page when it has one.
  const expansionColumns = [
    {
      field: 'gameId',
      label: 'ID',
      width: 96,
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
      formatter: (value, row) => cells.image(value, row.name)
    },
    {
      field: 'name',
      label: 'Expansion',
      filterable: true,
      filterType: 'text',
      flex: 1,
      formatter: (value, row) => (row.slug !== null && row.slug !== undefined)
        ? cells.link(slugLink(row.slug), value)
        : cells.text(value)
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

<div class="stack">
  <BackButton>
    {#if slug !== 'unknown'}
      <h3><a href="{slugLink(slug)}">{name}</a></h3>
    {:else}
      <h3>No session data loaded</h3>
    {/if}
  </BackButton>

  {#if slug !== 'unknown'}
    <h3>{title}</h3>
  {/if}
</div>

<LoadZone source={loadData()} let:result>
  <div class="stack">
    <div class="session-summary">
      <GameImage imagePath={result.imagePath} name={result.name} />
      <div class="session-content">
        {@html result.content}
      </div>
    </div>

    <div class="row-lg">
      {#if result.isLearning}
        <wa-badge variant="warning">Learning Game!</wa-badge>
      {/if}
      <wa-badge variant="brand">{server.gameTypeName(result.playType)}</wa-badge>
      <wa-badge variant="neutral">
        Played {result.sessionBegin.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}
        @
        {result.sessionBegin.toLocaleString(DateTime.TIME_SIMPLE)}
        &#x276F;
        {result.sessionEnd.toLocaleString(DateTime.TIME_SIMPLE)}
        ({result.sessionDuration.toHuman({'unitDisplay': 'short'})})
      </wa-badge>
    </div>

    <h4>Players</h4>
    <DataGrid data={result.players} columns={playerColumns} pageSize={10} />

    {#if result.expansions.length > 0}
      <h4>Expansions</h4>
      <DataGrid data={result.expansions} columns={expansionColumns} pageSize={5} />
    {/if}
  </div>

  <svelte:fragment slot="error" let:error>
    {error}
  </svelte:fragment>
</LoadZone>

<style>
  h3 {
    text-transform: capitalize;
  }

  .session-summary {
    display: grid;
    grid-template-columns: max-content auto;
    gap: 16px;
    align-items: start;
  }

  .session-content {
    padding-left: 12px;
    border-left: 1.5px solid var(--wa-color-surface-border);
  }
</style>
