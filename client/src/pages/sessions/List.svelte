<script>
  import { DateTime } from 'luxon';

  import { api } from '$api';

  import { replaceQuery } from '$lib/router.js';
  import { readBooleanPreference, writeBooleanPreference } from '$lib/preferences.js';
  import { people } from '$stores/people';
  import { sessionStatus } from '$stores/sessionStatus';

  import SessionList from '$components/lists/SessionList.svelte';
  import PageHead from '$components/PageHead.svelte';
  import SummaryGrid from '$components/SummaryGrid.svelte';
  import SummaryCard from '$components/SummaryCard.svelte';
  import IconButton from '$components/IconButton.svelte';
  import SessionAddDialog from '$components/dialogs/SessionAddDialog.svelte';

  // ---------------------------------------------------------------------------
  // Route state
  // ---------------------------------------------------------------------------

  export let routeInfo = { query: {} };

  const playTypes = [
    { value: 'cardboard',       label: 'Cardboard' },
    { value: 'boardgamearena',  label: 'Board Game Arena' },
    { value: 'steam',           label: 'Steam' },
    { value: 'gog',             label: 'GOG' },
    { value: 'android',         label: 'Android' },
  ];

  const FILTERS_OPEN_KEY = 'luddatumbazo:sessions-filters-open';

  const blankFilters = () => ({
    players: [],
    match: 'all',
    game: '',
    status: 'all',
    household: false,
    from: '',
    to: '',
    playType: '',
    learning: false
  });

  let filters = blankFilters();
  let appliedRoute = null;
  let filterVersion = 0;
  let filtersOpen = readBooleanPreference(FILTERS_OPEN_KEY) ?? false;
  let resultCount = null;
  let peopleError = null;
  let gamesError = null;
  let gameOptions = [];
  let loadToken = 0;

  // Comboboxes keep their text input independent from their value, so an
  // external reset (Clear filters or a route change) has to clear the text as
  // well as the selection.
  let gameBox = null;
  let usersBox = null;
  let guestsBox = null;

  const resetComboboxText = (gameName = '') => {
    if (gameBox !== null) {
      gameBox.inputValue = gameName;
    }
    if (usersBox !== null) {
      usersBox.inputValue = '';
    }
    if (guestsBox !== null) {
      guestsBox.inputValue = '';
    }
  };

  // The number of filter dimensions in use, not the number of selected
  // people; the URL badge should read "3 filters", not "Alice, Bob, Carol".
  const activeCount = value => [
    value.players.length > 0,
    value.game !== '',
    value.status !== 'all',
    value.household,
    value.from !== '' || value.to !== '',
    value.playType !== '',
    value.learning
  ].filter(Boolean).length;

  const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') &&
    DateTime.fromISO(value).isValid;

  // Read the page's own query keys into a complete filter object. Malformed
  // hand-edited values degrade to their defaults rather than breaking the page.
  const parseFilters = query => {
    const next = blankFilters();
    const keys = String(query.players ?? '')
      .split(',')
      .map(key => key.trim())
      .filter(key => /^[ug]:\d+$/.test(key));

    next.players = [...new Set(keys)];
    next.match = query.match === 'any' ? 'any' : 'all';
    next.game = /^[a-z0-9][a-z0-9-]*$/.test(String(query.game ?? ''))
      ? String(query.game)
      : '';
    next.status = (query.status === 'open' || query.status === 'closed')
      ? query.status
      : 'all';
    next.household = query.household === 'me';
    next.from = isDate(query.from) ? query.from : '';
    next.to = isDate(query.to) ? query.to : '';
    next.playType = playTypes.some(entry => entry.value === query.playType)
      ? query.playType
      : '';
    next.learning = query.learning === 'true';

    // A hand-edited range that runs backwards is normalized rather than
    // silently producing zero results.
    if (next.from !== '' && next.to !== '' && next.from > next.to) {
      [next.from, next.to] = [next.to, next.from];
    }

    return next;
  };

  // The query keys owned by this page. Empty/default values are dropped by the
  // router, so an unfiltered URL returns to `#/sessions`.
  const filterQuery = value => ({
    players: value.players.length > 0 ? [...value.players].sort().join(',') : undefined,
    match: value.players.length > 0 && value.match === 'any' ? 'any' : undefined,
    game: value.game === '' ? undefined : value.game,
    status: value.status === 'all' ? undefined : value.status,
    household: value.household ? 'me' : undefined,
    from: value.from === '' ? undefined : value.from,
    to: value.to === '' ? undefined : value.to,
    playType: value.playType === '' ? undefined : value.playType,
    learning: value.learning ? 'true' : undefined
  });

  const applyFilters = next => {
    filters = { ...filters, ...next };
    filterVersion += 1;

    // A filter change starts the grid at page one while preserving its search
    // and sort parameters.
    replaceQuery({ ...filterQuery(filters), page: undefined });
  };

  const clearFilters = () => {
    filters = blankFilters();
    resetComboboxText();
    filterVersion += 1;
    replaceQuery({
      players: undefined,
      match: undefined,
      game: undefined,
      status: undefined,
      household: undefined,
      from: undefined,
      to: undefined,
      playType: undefined,
      learning: undefined,
      page: undefined
    });
  };

  const setPlayers = (users, guests) => {
    const keys = [
      ...(users ?? []).map(id => `u:${id}`),
      ...(guests ?? []).map(id => `g:${id}`)
    ];

    applyFilters({ players: [...new Set(keys)] });
  };

  const setDate = (key, value) => {
    const next = { ...filters, [key]: isDate(value) ? value : '' };

    // Keep the range valid as the user edits either endpoint. The native date
    // controls also expose min/max, but typing can bypass those hints.
    if (next.from !== '' && next.to !== '' && next.from > next.to) {
      if (key === 'from') {
        next.to = next.from;
      }
      else {
        next.from = next.to;
      }
    }

    applyFilters(next);
  };

  $: selectedUsers = filters.players
    .filter(key => key.startsWith('u:'))
    .map(key => key.slice(2));
  $: selectedGuests = filters.players
    .filter(key => key.startsWith('g:'))
    .map(key => key.slice(2));
  $: activeFilterCount = activeCount(filters);

  // Rehydrate once per route object. Query-only navigation creates a new object
  // without remounting the page, and replaceQuery() does not update the route
  // store, so page-initiated changes set filters locally and never wait for
  // this block.
  $: if (routeInfo !== appliedRoute) {
    appliedRoute = routeInfo;
    filters = parseFilters(routeInfo.query ?? {});
    filtersOpen = readBooleanPreference(FILTERS_OPEN_KEY) ?? (activeCount(filters) > 0);
    resetComboboxText(
      gameOptions.find(game => game.slug === filters.game)?.name ?? ''
    );
    filterVersion += 1;
  }

  const loadSessions = async snapshot => {
    const token = ++loadToken;

    // The URL carries local calendar dates; the API compares instants. Compute
    // local day boundaries so an evening session is not pushed into the next
    // UTC day.
    const from = snapshot.from === ''
      ? undefined
      : DateTime.fromISO(snapshot.from).startOf('day').toUTC().toISO();
    const to = snapshot.to === ''
      ? undefined
      : DateTime.fromISO(snapshot.to).endOf('day').toUTC().toISO();

    resultCount = null;

    const rows = await api.session.list(
      true,
      snapshot.game === '' ? undefined : snapshot.game,
      snapshot.status === 'all' ? undefined : snapshot.status,
      {
        players: snapshot.players,
        match: snapshot.match,
        household: snapshot.household,
        from,
        to,
        playType: snapshot.playType,
        learning: snapshot.learning ? true : undefined
      }
    );

    if (token === loadToken) {
      resultCount = rows.length;
    }

    return rows;
  };

  // The keyed block below remounts the grid when either the filter state or
  // the page's own refresh token changes. The loader reads the current filters
  // when the new instance calls it, so it does not need its own reactive
  // assignment.
  const loader = () => loadSessions(filters);

  // The people lists are shared with the session dialog; load them once and
  // leave the other filters usable if that request fails.
  people.ensure().catch(error => {
    peopleError = error.message ?? 'unable to load the people lists';
  });

  const retryPeople = () => {
    peopleError = null;
    people.refresh().catch(error => {
      peopleError = error.message ?? 'unable to load the people lists';
    });
  };

  // The game picker's options change rarely; load them once for this visit and
  // keep the rest of the filters usable if the request fails.
  const loadGames = () => {
    gamesError = null;
    api.game.list()
      .then(list => {
        gameOptions = list;
      })
      .catch(error => {
        gamesError = error.message ?? 'unable to load the games list';
      });
  };

  loadGames();

  const setFiltersOpen = open => {
    filtersOpen = open;
    writeBooleanPreference(FILTERS_OPEN_KEY, open);
  };

  const toggleFilters = () => {
    setFiltersOpen(!filtersOpen);
  };

  const closeFilters = () => {
    setFiltersOpen(false);
  };

  // The add session report dialog and its refresh token. The dialog opens once
  // per route object carrying `add=1`; replaceQuery() does not update the route
  // store, so this guard is what makes close/reopen work repeatedly.
  let addDialogOpen = false;
  let listVersion = 0;
  let consumedAddRoute = null;

  $: if (routeInfo !== consumedAddRoute) {
    consumedAddRoute = routeInfo;

    if (routeInfo.query?.add === '1') {
      addDialogOpen = true;
    }
  }

  const addClosed = detail => {
    addDialogOpen = false;

    if (routeInfo.query?.add === '1') {
      replaceQuery({ add: undefined });
    }

    if (detail?.result !== null && detail?.result !== undefined) {
      listVersion += 1;
      window.location.hash = `#/session/${detail.result.sessionId}`;
    }
  };
</script>


<PageHead title="Sessions"
          description="Track what the group has played and pick up sessions that are still in progress."
          hideDescriptionOnNarrow inlineActionsOnNarrow>
  <svelte:fragment slot="actions">
    <IconButton variant="brand" appearance="filled" title="Add a new session report"
                caption="" label="Add session report" icon="plus-lg"
                onclick={() => addDialogOpen = true} />
  </svelte:fragment>
</PageHead>

<SummaryGrid>
  <SummaryCard label="Total" value={$sessionStatus.data?.total ?? '—'} note="sessions"
               href="#/sessions" title="Show every session"
               active={activeFilterCount === 0} />
  <SummaryCard label="In progress" value={$sessionStatus.data?.open ?? '—'} note="open"
               href="#/sessions?status=open" title="Show sessions that are still open"
               active={filters.status === 'open'} />
  <SummaryCard label="Household" value={$sessionStatus.data?.householdSessions ?? '—'}
               note="sessions" href="#/sessions?household=me"
               title="Show sessions with players from your households"
               active={filters.household} />
</SummaryGrid>

<details class="filters" open={filtersOpen}>
  <summary on:click|preventDefault={toggleFilters}>
    <span class="filter-chevron" aria-hidden="true"></span>
    <span class="filter-heading">Filters</span>
    {#if activeFilterCount > 0}
      <wa-badge variant="brand">{activeFilterCount}</wa-badge>
    {/if}
    <span class="filter-spacer"></span>
    {#if resultCount !== null}
      <span class="muted">{resultCount === 1 ? '1 session' : `${resultCount} sessions`}</span>
    {/if}
  </summary>

  <div class="filter-body">
    {#if peopleError !== null}
      <div class="filter-warning">
        <span>{peopleError}</span>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button size="s" appearance="plain" on:click={retryPeople}>Retry</wa-button>
      </div>
    {/if}

    {#if gamesError !== null}
      <div class="filter-warning">
        <span>{gamesError}</span>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button size="s" appearance="plain" on:click={loadGames}>Retry</wa-button>
      </div>
    {/if}

    <wa-combobox bind:this={gameBox} label="Game" value={filters.game}
                 placeholder="Any game" with-clear
                 on:change={event => applyFilters({ game: event.target.value ?? '' })}>
      {#each gameOptions as game (game.slug)}
        <wa-option value={game.slug}>{game.name}</wa-option>
      {/each}
      <span slot="empty">No games loaded.</span>
      <span slot="no-results">No games match.</span>
    </wa-combobox>

    <wa-combobox bind:this={usersBox} multiple label="Users" value={selectedUsers}
                 placeholder="Any users" with-clear max-options-visible="1"
                 on:change={event => setPlayers(event.target.value ?? [], selectedGuests)}>
      {#each $people.users as person (person.id)}
        <wa-option value={String(person.id)}>{person.displayName ?? person.name}</wa-option>
      {/each}
      <span slot="empty">No users loaded.</span>
      <span slot="no-results">No users match.</span>
    </wa-combobox>

    <wa-combobox bind:this={guestsBox} multiple label="Guests" value={selectedGuests}
                 placeholder="Any guests" with-clear max-options-visible="1"
                 on:change={event => setPlayers(selectedUsers, event.target.value ?? [])}>
      {#each $people.guests as person (person.id)}
        <wa-option value={String(person.id)}>{person.name}</wa-option>
      {/each}
      <span slot="empty">No guests loaded.</span>
      <span slot="no-results">No guests match.</span>
    </wa-combobox>

    <wa-select label="Match selected people" value={filters.match}
               title="Applies to every selected user and guest"
               disabled={filters.players.length === 0}
               on:change={event => applyFilters({ match: event.target.value === 'all' ? 'all' : 'any' })}>
      <wa-option value="all">Every selected person</wa-option>
      <wa-option value="any">Any selected person</wa-option>
    </wa-select>

    <wa-input type="date" label="From" value={filters.from}
              max={filters.to || undefined}
              on:change={event => setDate('from', event.target.value)}></wa-input>

    <wa-input type="date" label="To" value={filters.to}
              min={filters.from || undefined}
              on:change={event => setDate('to', event.target.value)}></wa-input>

    <wa-select label="Play type" value={filters.playType}
               on:change={event => applyFilters({ playType: event.target.value ?? '' })}>
      <wa-option value="">Any play type</wa-option>
      {#each playTypes as entry (entry.value)}
        <wa-option value={entry.value}>{entry.label}</wa-option>
      {/each}
    </wa-select>

    <wa-select label="Status" value={filters.status}
               on:change={event => applyFilters({ status: event.target.value })}>
      <wa-option value="all">All sessions</wa-option>
      <wa-option value="open">In progress</wa-option>
      <wa-option value="closed">Closed</wa-option>
    </wa-select>

    <div class="switch-field">
      <wa-switch checked={filters.household}
                 on:change={event => applyFilters({ household: event.target.checked })}>
        My household only
      </wa-switch>
    </div>

    <div class="switch-field">
      <wa-switch checked={filters.learning}
                 on:change={event => applyFilters({ learning: event.target.checked })}>
        Learning games only
      </wa-switch>
    </div>

    <div class="filter-actions">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="outlined" variant="neutral" size="s"
                 disabled={activeFilterCount === 0}
                 on:click={clearFilters}>Clear filters</wa-button>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="filled" variant="brand" size="s"
                 on:click={closeFilters}>Done</wa-button>
    </div>
  </div>
</details>

{#key `${listVersion}:${filterVersion}`}
  <SessionList {loader} fill gridKey="sessions" status={filters.status}
               showOpenPanel={filters.status === 'all'}
               emptyMessage={activeFilterCount > 0 ? 'No sessions match these filters.' : undefined} />
{/key}

{#if addDialogOpen}
  <SessionAddDialog open={true} onclose={addClosed} />
{/if}


<style>
  .filters {
    margin-bottom: 16px;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-lowered);
    overflow: visible;
  }

  /* The native details styling adds content padding when open and a trailing
     chevron of its own. Keep this panel's header and body flush. */
  .filters[open] {
    padding: 0;
  }

  .filters > summary {
    display: flex;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    gap: 8px;
    margin-inline: 0;
    padding: 10px 16px;
    border-radius: var(--wa-border-radius-m);
    background: transparent;
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: background var(--wa-transition-normal);
  }

  .filters > summary::-webkit-details-marker,
  .filters > summary::after {
    display: none;
  }

  .filters[open] > summary {
    border-radius: var(--wa-border-radius-m) var(--wa-border-radius-m) 0 0;
  }

  .filters > summary:hover,
  .filters > summary:focus-visible {
    background: var(--wa-color-surface-default);
  }

  .filters > summary:focus-visible {
    outline: 2px solid var(--wa-color-brand-border-loud);
    outline-offset: -2px;
  }

  .filter-chevron {
    flex: 0 0 auto;
    width: 7px;
    height: 7px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(-45deg);
    transition: transform var(--wa-transition-normal);
  }

  .filters[open] .filter-chevron {
    transform: rotate(45deg);
  }

  .filter-heading {
    font-weight: var(--wa-font-weight-semibold);
  }

  .filter-spacer {
    flex: 1 1 auto;
  }

  /* The filters are an ordinary accordion section: opening them moves the
     list down instead of covering the in-progress panel. Both panels can be
     folded when the window is short. */
  .filter-body {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    align-items: end;
    gap: 12px;
    max-height: min(70vh, 480px);
    overflow-y: auto;
    padding: 12px 16px 16px;
    border-top: 1px solid var(--wa-color-surface-border);
    border-radius: 0 0 var(--wa-border-radius-m) var(--wa-border-radius-m);
    background: var(--wa-color-surface-default);
  }

  /* The explicit display above would otherwise beat the browser's own
     DetailsContent hiding rule while the panel is closed. */
  .filters:not([open]) .filter-body {
    display: none;
  }

  .filter-body wa-combobox {
    width: 100%;
    min-width: 0;
  }

  .filter-warning {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid var(--wa-color-warning-border-loud);
    border-radius: var(--wa-border-radius-s);
    color: var(--wa-color-warning-on-quiet);
  }

  .switch-field {
    display: flex;
    align-items: center;
    min-height: 40px;
  }

  .filter-actions {
    position: sticky;
    bottom: 0;
    z-index: 1;
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 8px;
    background: var(--wa-color-surface-default);
  }

</style>
