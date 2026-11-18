<script>
  import { DateTime } from 'luxon';

  import { api } from '$api';
  import { server } from '$stores/server';

  import LoadZone from '$components/LoadZone.svelte';
  import DataGrid from '$components/DataGrid.svelte';
  import PageHead from '$components/PageHead.svelte';
  import SummaryGrid from '$components/SummaryGrid.svelte';
  import SummaryCard from '$components/SummaryCard.svelte';
  import Panel from '$components/Panel.svelte';
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

  // The permission note in the page head, or undefined when the viewer can
  // edit and no note is needed.
  $: permissionNote = loaded === null || loaded.canEdit === true
    ? undefined
    : (loaded.isOpen === true
      ? 'Only session participants or its reporter can edit this open report.'
      : 'Only the reporter can edit this closed report.');

  // Using the props that we were given, generate out the kinds of links that
  // the table needs to generate internal links to the data that it contains.
  const slugLink = slug => '#/game/:slug'.replaceAll(':slug', slug);

  // Format a whole-minute duration for the summary cards. Open sessions don't
  // have a duration yet and are handled by the caller.
  const formatDuration = minutes => {
    if (minutes === null || minutes === undefined) {
      return 'In progress';
    }

    if (minutes < 1) {
      return 'Less than a minute';
    }

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    if (hours === 0) {
      return `${remainder} min`;
    }

    if (remainder === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr, ${remainder} min`;
  };

  const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

  // The compact user/guest split shown below the player count.
  const playerBreakdown = players => {
    if (players.length === 0) {
      return 'No players';
    }

    const users = players.filter(player => player.isUser === true).length;
    const guests = players.length - users;
    const parts = [];

    if (users > 0) {
      parts.push(plural(users, 'user'));
    }

    if (guests > 0) {
      parts.push(plural(guests, 'guest'));
    }

    return parts.join(' · ');
  };

  // Build the display-only summary once, after the dates and duration have
  // been normalized. Keeping this on the loaded result means the page head and
  // the summary strip cannot disagree about date, duration or player counts.
  const buildSummary = result => {
    const players = result.players ?? [];
    const winners = players.filter(player => player.isWinner === true);
    const beginTime = result.sessionBegin.toLocaleString(DateTime.TIME_SIMPLE);
    const endTime = result.sessionEnd?.toLocaleString(DateTime.TIME_SIMPLE) ?? null;

    return {
      playedLabel:  result.isOpen ? 'Started' : 'Played',
      dateText:     result.sessionBegin.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY),
      timeText:     beginTime,
      endTimeText:  endTime,
      durationText: result.isOpen ? 'In progress' : formatDuration(result.sessionDurationMinutes),
      durationNote: result.isOpen
        ? 'No end time yet'
        : (endTime === null ? beginTime : `${beginTime} – ${endTime}`),
      playerCount:  players.length,
      playerNote:   playerBreakdown(players),
      winnerText:   winners.length > 0
        ? winners.map(player => player.name).join(', ')
        : 'No winner recorded',
      winnerNote:   winners.length > 1 ? plural(winners.length, 'winner') : null,
      reporterText: result.reporterName || 'Unknown'
    };
  };

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

    // Store whole minutes; the summary formatter never shows the fractional
    // minutes that Luxon's Duration produced in the old display.
    result.sessionBegin = begin
    result.sessionEnd = end
    result.sessionDurationMinutes = end === null
      ? null
      : Math.max(0, Math.round(end.diff(begin, 'minutes').minutes));
    result.summary = buildSummary(result);

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
  // starting player and the winner of the session. The raw user id is not
  // useful to a reader, so the Type column carries the user/guest distinction
  // instead.
  const playerColumns = [
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
      flex: 1,
      sortFn: 'alphanumeric'
    },
    {
      id: 'type',
      field: 'isUser',
      label: 'Type',
      width: 84,
      align: 'center',
      sortFn: 'basic',
      formatter: (value) => cells.badge(value === true ? 'User' : 'Guest',
                                        value === true ? 'brand' : 'neutral')
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
  // page when it has one. The internal game id is not shown.
  const expansionColumns = [
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

<PageHead backTo="#/sessions"
          title={slug === 'unknown' ? 'No session data loaded' : title}
          description={permissionNote}>
  <svelte:fragment slot="media">
    {#if slug !== 'unknown' && loaded?.imagePath}
      <div class="game-thumb">
        <wa-lightbox label={`${loaded.name} box art`}
                     without-counter without-navigation>
          <wa-lightbox-item src={loaded.imageFullPath}
                            alt={`${loaded.name} box art`}>
            <GameImage imagePath={loaded.imagePath} name={loaded.name} />
          </wa-lightbox-item>
        </wa-lightbox>
      </div>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="eyebrow">
    {#if slug !== 'unknown'}
      <a class="game-link" href={slugLink(slug)}>{name}</a>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="badges">
    {#if loaded !== null}
      <wa-badge variant={loaded.isOpen ? 'warning' : 'neutral'}>
        {loaded.isOpen ? 'In progress' : 'Closed'}
      </wa-badge>

      {#if loaded.isLearning}
        <wa-badge variant="warning">Learning game</wa-badge>
      {/if}

      <wa-badge variant="brand">{server.gameTypeName(loaded.playType)}</wa-badge>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="actions">
    {#if loaded?.canEdit === true}
      {#if loaded.isOpen === true}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button appearance="filled" variant="brand" on:click={finishReport}>
          Finish Session
        </wa-button>
      {/if}

      <IconButton variant="brand" appearance="filled" title="Edit this session report"
                  caption="" icon="pencil-fill"
                  onclick={editReport} />
    {/if}
  </svelte:fragment>
</PageHead>

<LoadZone source={detailsSource} let:result>
  <div class="stack">
    <SummaryGrid spaced={false}>
      <SummaryCard label={result.summary.playedLabel}
                   value={result.summary.dateText}
                   note={result.summary.timeText} />
      <SummaryCard label="Duration" value={result.summary.durationText}
                   note={result.summary.durationNote} />
      <SummaryCard label="Players" value={result.summary.playerCount}
                   note={result.summary.playerNote} />
      <SummaryCard label="Winner" value={result.summary.winnerText}
                   note={result.summary.winnerNote} />
      <SummaryCard label="Reporter" value={result.summary.reporterText} />
    </SummaryGrid>

    <Panel title="Players" note={plural(result.summary.playerCount, 'player')} flush>
      <DataGrid data={result.players} columns={playerColumns}
                withSearch={false} paginate={false}
                flush emptyMessage="No players recorded." />
    </Panel>

    <Panel title="Report" note="Session write-up">
      <div class="report-copy">
        <MarkdownContent content={result.content} empty="No report text yet." />
      </div>
    </Panel>

    {#if result.expansions.length > 0}
      <Panel title="Expansions" note={plural(result.expansions.length, 'expansion')} flush>
        <DataGrid data={result.expansions} columns={expansionColumns} pageSize={5} flush />
      </Panel>
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
  .game-thumb {
    flex: 0 0 96px;
    width: 96px;
  }

  /* Keep the lightbox host out of the layout so the resting image keeps the
     thumb's width instead of adding a wrapper box. */
  .game-thumb wa-lightbox {
    display: contents;
  }

  .game-thumb :global(img) {
    width: 100%;
    height: auto;
  }

  .game-link {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    font-weight: var(--wa-font-weight-semibold);
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  .game-link:hover,
  .game-link:focus-visible {
    text-decoration: underline;
  }

  .report-copy {
    max-width: 80ch;
  }

  @media (max-width: 720px) {
    .game-thumb {
      flex-basis: 72px;
      width: 72px;
    }
  }

  @media (max-width: 480px) {
    .game-thumb {
      flex-basis: 64px;
      width: 64px;
    }
  }
</style>
