<script>
  import { DateTime, Interval } from 'luxon';

  import { api } from '$api';
  import { server } from '$stores/server';

  import LoadZone from '$components/LoadZone.svelte';
  import DataGrid from '$components/DataGrid.svelte';
  import BackButton from '$components/BackButton.svelte';
  import IconButton from '$components/IconButton.svelte';
  import BGGLink from '$components/links/BGGLink.svelte';
  import GameImage from '$components/GameImage.svelte';
  import MarkdownContent from '$components/MarkdownContent.svelte';
  import SessionAddDialog from '$components/dialogs/SessionAddDialog.svelte';

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

  // The loaded session report, kept so that the edit dialog can be populated
  // from it, and the state of that dialog. The dialog may be editing the report
  // or finishing it with the end time prefilled to now.
  let loaded = null;
  let editOpen = false;
  let editSession = null;

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
    loaded = result;

    // Convert the incoming session begin and end into DateTime for easier
    // handling. An open session has no end, so it has no duration either.
    const begin = DateTime.fromISO(result.sessionBegin);
    const end   = result.sessionEnd === null ? null : DateTime.fromISO(result.sessionEnd);

    let duration = null;
    if (end !== null) {
      // Calculate the duration; we want this to be in minutes unless the game
      // took at least an hour.
      duration = Interval.fromDateTimes(begin, end).toDuration(['minutes']);
      if (duration.minutes > 60) {
        duration = duration.shiftTo('hours', 'minutes');
      }
    }

    // Store back now
    result.sessionBegin = begin
    result.sessionEnd = end
    result.sessionDuration = duration;

    return result;
  };

  // The load zone watches this promise; replacing it reloads the report after
  // an edit (or a finish) without rebuilding the whole page.
  let detailsSource = loadData();
  const reload = () => {
    detailsSource = loadData();
  };

  // Open the dialog for an ordinary edit, or for finishing an open session with
  // its end prefilled to now. Nothing is saved until the dialog is saved.
  const editReport = () => {
    editSession = loaded;
    editOpen = true;
  };

  const finishReport = () => {
    editSession = { ...loaded, sessionEnd: new Date().toISOString() };
    editOpen = true;
  };

  const editClosed = detail => {
    editOpen = false;

    if (detail?.result !== null && detail?.result !== undefined) {
      reload();
    }
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
        ? cells.icon('flag-fill', { color: 'var(--wa-color-text-link)', title: 'Starting player' })
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
        ? cells.icon('trophy-fill', { color: 'var(--wa-color-warning-on-quiet)', title: 'Winner of the session' })
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
      formatter: (value, row) => cells.image(value, row)
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
  <BackButton to="#/sessions">
    {#if slug !== 'unknown'}
      <h3><a href="{slugLink(slug)}">{name}</a></h3>
    {:else}
      <h3>No session data loaded</h3>
    {/if}
  </BackButton>

  {#if slug !== 'unknown'}
    <div class="title-row">
      <h3>{title}</h3>

      {#if loaded?.canEdit === true}
        <div class="row">
          {#if loaded.isOpen === true}
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <wa-button appearance="filled" variant="brand" on:click={finishReport}>
              Finish Session
            </wa-button>
          {/if}

          <IconButton variant="brand" appearance="filled" title="Edit this session report"
                      caption="" icon="pencil-fill"
                      onclick={editReport} />
        </div>
      {:else if loaded !== null}
        <span class="muted">
          {#if loaded.isOpen === true}
            Only session participants or its reporter can edit this open report.
          {:else}
            Only the reporter can edit this closed report.
          {/if}
        </span>
      {/if}
    </div>
  {/if}
</div>

<LoadZone source={detailsSource} let:result>
  <div class="stack">
    <div class="session-summary">
      <wa-lightbox label={`${result.name} box art`}
                   without-counter without-navigation>
        <wa-lightbox-item src={result.imageFullPath}
                          alt={`${result.name} box art`}>
          <GameImage imagePath={result.imagePath} name={result.name} />
        </wa-lightbox-item>
      </wa-lightbox>

      <div class="session-content">
        <MarkdownContent content={result.content} />
      </div>
    </div>

    <div class="row-lg">
      {#if result.isLearning}
        <wa-badge variant="warning">Learning Game!</wa-badge>
      {/if}
      <wa-badge variant="brand">{server.gameTypeName(result.playType)}</wa-badge>

      {#if result.isOpen === true}
        <wa-badge variant="warning">In progress</wa-badge>
        <wa-badge variant="neutral">
          Started {result.sessionBegin.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}
          @
          {result.sessionBegin.toLocaleString(DateTime.TIME_SIMPLE)}
        </wa-badge>
      {:else}
        <wa-badge variant="neutral">
          Played {result.sessionBegin.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}
          @
          {result.sessionBegin.toLocaleString(DateTime.TIME_SIMPLE)}
          &#x276F;
          {result.sessionEnd.toLocaleString(DateTime.TIME_SIMPLE)}
          ({result.sessionDuration.toHuman({'unitDisplay': 'short'})})
        </wa-badge>
      {/if}

      {#if result.reporterName !== null && result.reporterName !== undefined}
        <wa-badge variant="neutral">Logged by {result.reporterName}</wa-badge>
      {/if}
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

{#if editOpen}
  <SessionAddDialog open={true} session={editSession} onclose={editClosed} />
{/if}

<style>
  h3 {
    text-transform: capitalize;
  }

  /* The report title with its edit control pushed to the far side. */
  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .session-summary {
    display: grid;
    grid-template-columns: max-content auto;
    gap: 16px;
    align-items: start;
  }

  /* Keep the lightbox host out of the grid layout so the resting image keeps
     exactly the same column it had before the lightbox was added. */
  .session-summary wa-lightbox {
    display: contents;
  }

  .session-content {
    min-width: 0;
    padding-left: 12px;
    border-left: 1.5px solid var(--wa-color-surface-border);
  }
</style>
