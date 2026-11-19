<script>
  import { DateTime } from 'luxon';

  import LoadZone from '$components/LoadZone.svelte';
  import DataGrid from '$components/DataGrid.svelte';
  import Icon from '$components/Icon.svelte';

  import { server } from '$stores/server';

  import { readBooleanPreference, writeBooleanPreference } from '$lib/preferences.js';
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

  // The active list filter. The full list shows the In progress section; the
  // open-only view shows just the open rows and relies on the page for the
  // route back to all sessions.
  export let status = 'all';
  export let showOpenPanel = false;

  // A page with active filters can explain an empty result more precisely than
  // the generic open-only message.
  export let emptyMessage = undefined;

  // Remember whether the in-progress section is folded. It defaults open, and
  // the choice follows the user across list refreshes and visits.
  const OPEN_PANEL_KEY = 'luddatumbazo:sessions-open-panel-open';
  let openPanelOpen = readBooleanPreference(OPEN_PANEL_KEY) ?? true;

  const toggleOpenPanel = () => {
    openPanelOpen = !openPanelOpen;
    writeBooleanPreference(OPEN_PANEL_KEY, openPanelOpen);
  };

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

  // A compact roster for the open-session cards. The API supplies this from a
  // single batched lookup with the list; the cards never fetch players again.
  const playerSummary = row => (row.players ?? [])
    .map(player => player.name)
    .filter(name => name !== null && name !== undefined && name !== '')
    .join(', ');

  // ---------------------------------------------------------------------------

  // The columns of the session grid. The icon columns present the game type of
  // the session and whether it was a learning game, the name links to the
  // session report, and (optionally) the game column links to the game the
  // session was for.
  const columns = [
    {
      id: 'playType',
      field: 'playType',
      label: '',
      width: 40,
      align: 'center',
      sortable: false,
      formatter: (value) => {
        const glyph = cells.icon(server.gameTypeIcon(value), { color: 'var(--wa-color-text-link)' });
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
        ? (() => { const glyph = cells.icon('mortarboard-fill', { color: 'var(--wa-color-warning-on-quiet)' }); glyph.setAttribute('title', 'Learning game'); return glyph; })()
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
    },
    {
      // The server supplies both the compact players array and the searchable
      // playerNames string this column sorts and displays.
      field: 'playerNames',
      label: 'Players',
      width: 200,
      sortFn: 'alphanumeric',
      formatter: (value) => cells.text(value)
    },
  ];

  // The status is only part of the full sessions page (and its open-only
  // view). Inline session lists on game pages keep their existing layout.
  const statusColumn = {
    id: 'status',
    field: 'isOpen',
    label: 'Status',
    width: 116,
    sortFn: 'basic',
    searchable: false,
    formatter: (value) => value === true
      ? cells.badge('In progress', 'warning')
      : cells.badge('Closed', 'neutral')
  };

  // The optional trailing column that links to the game for the session. The
  // game name is the link text; the chain-only icon made the column hard to
  // scan in the full list.
  const gameColumn = {
    id: 'game',
    field: 'name',
    label: 'Game',
    width: 180,
    sortFn: 'alphanumeric',
    formatter: (value, row) => cells.link(game(row.slug), value)
  };

  // Assemble the actual column list based on whether game links should show.
  // The status column is reserved for the sessions page; game detail lists do
  // not gain it as part of this phase.
  $: showSessionStatus = showOpenPanel === true || status !== 'all';
  $: gridColumns = [
    ...columns,
    ...(showSessionStatus === true ? [statusColumn] : []),
    ...(showGames === true ? [gameColumn] : [])
  ];

  // The load zone watches a stored promise so a failed request can be retried
  // in place; a template call to loader() would leave Retry nothing to rerun.
  let reloadTick = 0;
  const loadRows = async () => loader();

  $: source = loadRows(reloadTick);
  const reload = () => reloadTick += 1;
</script>


<LoadZone {source} onretry={reload} let:result>
  {#if result !== null && result !== undefined}
    {@const openRows = result.filter(row => row.isOpen === true)}

    <div class="session-list" class:fill>
      {#if showOpenPanel === true && status === 'all' && openRows.length > 0}
        <section class="open-panel" class:folded={!openPanelOpen}
                 aria-label="In progress sessions">
          <div class="open-head">
            <button type="button" class="open-toggle"
                    aria-expanded={openPanelOpen}
                    on:click={toggleOpenPanel}>
              <span class="open-chevron" aria-hidden="true"></span>
              <span class="open-heading">
                <span class="open-label">In progress</span>
                <strong>{openRows.length}</strong>
                <span class="muted">{openRows.length === 1 ? 'open session' : 'open sessions'}</span>
              </span>
            </button>
            <a href="#/sessions?status=open">View open only</a>
          </div>

          {#if openPanelOpen}
            <div class="open-list">
              {#each openRows as row (row.id)}
                <a class="open-card" href={session(row.id)}>
                  <span class="open-card-title">{row.title}</span>
                  <span class="open-card-game">{row.name}</span>
                  <span class="open-card-facts">
                    <span class="open-card-type" title={server.gameTypeName(row.playType)}>
                      <Icon name={server.gameTypeIcon(row.playType)} size="0.9em"
                            color="var(--wa-color-text-link)" />
                      {server.gameTypeName(row.playType)}
                    </span>
                    {#if row.isLearning === true}
                      <span class="open-card-learning" title="Learning game">
                        <Icon name="mortarboard-fill" size="0.9em" />
                        Learning game
                      </span>
                    {/if}
                  </span>
                  <span class="open-card-meta">
                    <wa-badge variant="warning">In progress</wa-badge>
                    <span>Started {DateTime.fromISO(row.sessionBegin).toLocaleString(DateTime.DATETIME_SHORT)}</span>
                    {#if playerSummary(row) !== ''}
                      <span class="open-card-players" title={playerSummary(row)}>
                        {playerSummary(row)}
                      </span>
                    {/if}
                  </span>
                  <span class="open-card-action">Continue</span>
                </a>
              {/each}
            </div>
          {/if}
        </section>
      {/if}

      {#key status}
        <DataGrid data={result} columns={gridColumns} {fill} {gridKey}
                  pageSize={showGames ? pageSize : Math.min(Math.max(result.length, 1), pageSize)}
                  emptyMessage={emptyMessage ?? (status === 'open' ? 'No open sessions.' : undefined)}>
          <slot name="actions" slot="actions" />
        </DataGrid>
      {/key}
    </div>
  {/if}
</LoadZone>


<style>
  .session-list.fill {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
  }

  .open-panel {
    flex: 0 0 auto;
    margin-bottom: 16px;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-lowered);
    overflow: hidden;
  }

  .open-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    box-sizing: border-box;
    min-height: 44px;
    padding: 6px 16px;
    border-bottom: 1px solid var(--wa-color-surface-border);
  }

  .open-toggle {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    height: 30px;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .open-toggle:focus-visible {
    outline: 2px solid var(--wa-color-brand-border-loud);
    outline-offset: 3px;
    border-radius: var(--wa-border-radius-s);
  }

  .open-chevron {
    flex: 0 0 auto;
    align-self: center;
    width: 7px;
    height: 7px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(45deg);
    transition: transform var(--wa-transition-normal);
  }

  .open-panel.folded .open-chevron {
    transform: rotate(-45deg);
  }

  .open-panel.folded .open-head {
    border-bottom: 0;
  }

  .open-heading {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .open-label {
    color: var(--wa-color-warning-on-quiet);
    font-size: var(--wa-font-size-s);
    font-weight: var(--wa-font-weight-semibold);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .open-heading strong {
    font-size: var(--wa-font-size-l);
  }

  .open-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1px;
    background: var(--wa-color-surface-border);
  }

  .open-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 12px;
    padding: 12px 16px;
    background: var(--wa-color-surface-default);
    color: inherit;
    text-decoration: none;
    transition: background var(--wa-transition-normal);
  }

  .open-card:hover,
  .open-card:focus-visible {
    background: var(--wa-color-surface-raised);
  }

  .open-card-title {
    grid-column: 1;
    min-width: 0;
    overflow: hidden;
    font-weight: var(--wa-font-weight-semibold);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .open-card-game {
    grid-column: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .open-card-facts {
    grid-column: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  .open-card-facts > span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .open-card-learning {
    color: var(--wa-color-warning-on-quiet);
  }

  .open-card-meta {
    grid-column: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  .open-card-players {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .open-card-action {
    grid-column: 2;
    grid-row: 1 / span 4;
    align-self: center;
    color: var(--wa-color-text-link);
    font-weight: var(--wa-font-weight-semibold);
  }
</style>
