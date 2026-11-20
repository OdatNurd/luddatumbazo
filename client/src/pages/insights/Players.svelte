<script>
  import { DateTime } from 'luxon';

  import { api } from '$api';

  import { replaceQuery } from '$lib/router.js';
  import { people } from '$stores/people';

  import PageHead from '$components/PageHead.svelte';
  import SummaryGrid from '$components/SummaryGrid.svelte';
  import SummaryCard from '$components/SummaryCard.svelte';
  import Panel from '$components/Panel.svelte';
  import LoadingState from '$components/LoadingState.svelte';
  import ErrorState from '$components/ErrorState.svelte';
  import EmptyState from '$components/EmptyState.svelte';

  // ---------------------------------------------------------------------------
  // Route state
  // ---------------------------------------------------------------------------

  export let routeInfo = { query: {} };

  const playTypes = [
    { value: 'cardboard',      label: 'Cardboard' },
    { value: 'boardgamearena', label: 'Board Game Arena' },
    { value: 'steam',          label: 'Steam' },
    { value: 'gog',            label: 'GOG' },
    { value: 'android',        label: 'Android' },
  ];

  const blankFilters = () => ({
    players: [],
    game: '',
    from: '',
    to: '',
    playType: '',
    learning: false
  });

  let filters = blankFilters();
  let report = null;
  let loading = false;
  let error = null;
  let games = [];
  let peopleError = null;
  let gamesError = null;
  let loadToken = 0;
  let consumedRoute = null;
  let filtersOpen = true;

  let usersBox = null;
  let guestsBox = null;
  let gameBox = null;

  const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') &&
    DateTime.fromISO(value).isValid;

  const parseFilters = query => {
    const next = blankFilters();
    const keys = String(query.players ?? '')
      .split(',')
      .map(key => key.trim())
      .filter(key => /^[ug]:\d+$/.test(key));

    next.players = [...new Set(keys)];
    next.game = /^[a-z0-9][a-z0-9-]*$/.test(String(query.game ?? ''))
      ? String(query.game)
      : '';
    next.from = isDate(query.from) ? query.from : '';
    next.to = isDate(query.to) ? query.to : '';
    next.playType = playTypes.some(entry => entry.value === query.playType)
      ? query.playType
      : '';
    next.learning = query.learning === 'true';

    if (next.from !== '' && next.to !== '' && next.from > next.to) {
      [next.from, next.to] = [next.to, next.from];
    }

    return next;
  };

  const filterQuery = value => ({
    players: value.players.length > 0 ? [...value.players].sort().join(',') : undefined,
    game: value.game === '' ? undefined : value.game,
    from: value.from === '' ? undefined : value.from,
    to: value.to === '' ? undefined : value.to,
    playType: value.playType === '' ? undefined : value.playType,
    learning: value.learning ? 'true' : undefined
  });

  $: selectedUsers = filters.players
    .filter(key => key.startsWith('u:'))
    .map(key => key.slice(2));
  $: selectedGuests = filters.players
    .filter(key => key.startsWith('g:'))
    .map(key => key.slice(2));
  $: canApply = filters.players.length > 0 || filters.game !== '';
  $: gameOnly = report !== null &&
    report.scope.game !== null &&
    report.scope.players.length === 0;
  $: gameName = games.find(game => game.slug === filters.game)?.name ?? '';
  $: activeFilterSummary = [
    filters.players.length > 0
      ? `${filters.players.length} ${filters.players.length === 1 ? 'person' : 'people'}`
      : '',
    gameName,
    filters.from !== '' || filters.to !== ''
      ? `${filters.from || '…'} → ${filters.to || '…'}`
      : '',
    filters.playType === ''
      ? ''
      : (playTypes.find(entry => entry.value === filters.playType)?.label ?? filters.playType),
    filters.learning ? 'Learning included' : ''
  ].filter(Boolean).join(' · ') || 'All sessions';

  const resetComboboxText = () => {
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

  // Rehydrate once per route object. Page-initiated changes write the URL with
  // replaceQuery(), which does not touch the route store, so those never bounce
  // back through this block.
  $: if (routeInfo !== consumedRoute) {
    consumedRoute = routeInfo;
    filters = parseFilters(routeInfo.query ?? {});
    resetComboboxText();

    if (filters.players.length > 0 || filters.game !== '') {
      loadReport(filters);
    }
    else {
      report = null;
      error = null;
    }
  }

  const setPlayers = (users, guests) => {
    filters = {
      ...filters,
      players: [
        ...(users ?? []).map(id => `u:${id}`),
        ...(guests ?? []).map(id => `g:${id}`)
      ]
    };
  };

  const setDate = (key, value) => {
    const next = { ...filters, [key]: isDate(value) ? value : '' };

    if (next.from !== '' && next.to !== '' && next.from > next.to) {
      if (key === 'from') {
        next.to = next.from;
      }
      else {
        next.from = next.to;
      }
    }

    filters = next;
  };

  const loadReport = async snapshot => {
    const token = ++loadToken;

    loading = true;
    error = null;

    const from = snapshot.from === ''
      ? undefined
      : DateTime.fromISO(snapshot.from).startOf('day').toUTC().toISO();
    const to = snapshot.to === ''
      ? undefined
      : DateTime.fromISO(snapshot.to).endOf('day').toUTC().toISO();

    try {
      const result = await api.insights.players({
        players: snapshot.players,
        game: snapshot.game,
        from,
        to,
        playType: snapshot.playType,
        includeLearning: snapshot.learning
      });

      if (token === loadToken) {
        report = result;
      }
    }
    catch (failure) {
      if (token === loadToken) {
        report = null;
        error = failure;
      }
    }
    finally {
      if (token === loadToken) {
        loading = false;
      }
    }
  };

  const apply = () => {
    if (canApply === false) {
      return;
    }

    replaceQuery({ ...filterQuery(filters), page: undefined });
    loadReport(filters);
    filtersOpen = false;
  };

  const reset = () => {
    filters = blankFilters();
    filtersOpen = true;
    resetComboboxText();
    report = null;
    error = null;
    replaceQuery({
      players: undefined,
      game: undefined,
      from: undefined,
      to: undefined,
      playType: undefined,
      learning: undefined
    });
  };

  people.ensure().catch(failure => {
    peopleError = failure.message ?? 'unable to load the people lists';
  });

  const loadGames = () => {
    gamesError = null;
    api.game.list()
      .then(list => {
        games = list;
      })
      .catch(failure => {
        gamesError = failure.message ?? 'unable to load the games list';
      });
  };

  loadGames();

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------

  const pct = value => (value === null || value === undefined)
    ? '—'
    : `${Number(value).toFixed(1)}%`;
  const minutes = value => (value === null || value === undefined)
    ? '—'
    : `${Math.round(value)}m`;
  const number = value => Number(value ?? 0).toLocaleString();

  const day = value => value === null || value === undefined
    ? '—'
    : DateTime.fromISO(value).toLocaleString({ month: 'short', year: 'numeric' });

  const personName = key => {
    const [kind, id] = key.split(':');
    const source = kind === 'u' ? $people.users : $people.guests;
    const person = source.find(entry => String(entry.id) === id);

    return person?.displayName ?? person?.name ?? key;
  };

  $: playerPlays = report?.players.map(person => person.plays) ?? [];
  $: playsMin = playerPlays.length === 0 ? null : Math.min(...playerPlays);
  $: playsMax = playerPlays.length === 0 ? null : Math.max(...playerPlays);
  $: playsAvg = playerPlays.length === 0
    ? null
    : playerPlays.reduce((total, value) => total + value, 0) / playerPlays.length;

  const warningText = warning => ({
    'undecided-sessions': `${number(warning.count)} multiplayer ${warning.count === 1 ? 'session had' : 'sessions had'} no winner and ${warning.count === 1 ? 'is' : 'are'} excluded from win rates.`,
    'solo-sessions': `${number(warning.count)} solo ${warning.count === 1 ? 'play counts' : 'plays count'} as plays, not wins.`,
    'missing-starters': `${number(warning.count)} ${warning.count === 1 ? 'session had' : 'sessions had'} no starting player; seat stats use only the sessions where one was recorded.`,
    'invalid-durations': `${number(warning.count)} ${warning.count === 1 ? 'session ended' : 'sessions ended'} at or before ${warning.count === 1 ? 'it' : 'they'} started and ${warning.count === 1 ? 'is' : 'are'} excluded from duration averages.`,
    'learning-excluded': `${number(warning.count)} learning ${warning.count === 1 ? 'session is' : 'sessions are'} excluded.`
  })[warning.code] ?? warning.code;
</script>


<PageHead title="Player Stats"
          description="Results by person, game, and seat. Learning games are excluded by default."
          hideDescriptionOnNarrow />

<div class="filters-panel" role="region" aria-label="Player Stats filters">
  <button type="button" class="filters-toggle" aria-expanded={filtersOpen}
          aria-controls="player-stats-filter-body"
          on:click={() => filtersOpen = !filtersOpen}>
    <span class="filters-title">Filters</span>
    <span class="filters-summary">{activeFilterSummary}</span>
    <span class="filters-chevron" aria-hidden="true"></span>
  </button>

  {#if filtersOpen}
  <div class="filters-body" id="player-stats-filter-body">
  {#if peopleError !== null}
    <div class="filter-warning">
      <span>{peopleError}</span>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button size="s" appearance="plain"
                 on:click={() => people.refresh().catch(() => {})}>Retry</wa-button>
    </div>
  {/if}

  {#if gamesError !== null}
    <div class="filter-warning">
      <span>{gamesError}</span>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button size="s" appearance="plain" on:click={loadGames}>Retry</wa-button>
    </div>
  {/if}

  <div class="filter-grid">
    <div class="field grow">
      <wa-combobox bind:this={usersBox} multiple label="Users"
                   value={selectedUsers} placeholder="Any users" with-clear
                   max-options-visible="1"
                   on:change={event => setPlayers(event.target.value ?? [], selectedGuests)}>
        {#each $people.users as person (person.id)}
          <wa-option value={String(person.id)}>{person.displayName ?? person.name}</wa-option>
        {/each}
        <span slot="empty">No users loaded.</span>
        <span slot="no-results">No users match.</span>
      </wa-combobox>
    </div>

    <div class="field grow">
      <wa-combobox bind:this={guestsBox} multiple label="Guests"
                   value={selectedGuests} placeholder="Any guests" with-clear
                   max-options-visible="1"
                   on:change={event => setPlayers(selectedUsers, event.target.value ?? [])}>
        {#each $people.guests as person (person.id)}
          <wa-option value={String(person.id)}>{person.name}</wa-option>
        {/each}
        <span slot="empty">No guests loaded.</span>
        <span slot="no-results">No guests match.</span>
      </wa-combobox>
    </div>

    <div class="field grow">
      <wa-combobox bind:this={gameBox} label="Game" value={filters.game}
                   placeholder="Any game" with-clear
                   on:change={event => filters = { ...filters, game: event.target.value ?? '' }}>
        {#each games as game (game.slug)}
          <wa-option value={game.slug}>{game.name}</wa-option>
        {/each}
        <span slot="empty">No games loaded.</span>
        <span slot="no-results">No games match.</span>
      </wa-combobox>
    </div>

    <div class="field">
      <wa-input type="date" label="From" value={filters.from}
                max={filters.to || undefined}
                on:change={event => setDate('from', event.target.value)}></wa-input>
    </div>

    <div class="field">
      <wa-input type="date" label="To" value={filters.to}
                min={filters.from || undefined}
                on:change={event => setDate('to', event.target.value)}></wa-input>
    </div>

    <div class="field">
      <wa-select label="Play type" value={filters.playType}
                 on:change={event => filters = { ...filters, playType: event.target.value ?? '' }}>
        <wa-option value="">Any play type</wa-option>
        {#each playTypes as entry (entry.value)}
          <wa-option value={entry.value}>{entry.label}</wa-option>
        {/each}
      </wa-select>
    </div>

    <div class="field switch-field">
      <wa-switch checked={filters.learning}
                 on:change={event => filters = { ...filters, learning: event.target.checked }}>
        Include learning
      </wa-switch>
    </div>
  </div>

  <div class="filter-foot">
    <span class="muted">
      {#if report !== null}
        {report.scope.players.length} {report.scope.players.length === 1 ? 'person' : 'people'}
        · {number(report.group.sessions)} sessions
        {#if report.group.learningExcluded > 0}
          · {number(report.group.learningExcluded)} learning excluded
        {/if}
      {:else}
        Choose at least one person or a game.
      {/if}
    </span>

    <div class="filter-actions">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="outlined" variant="neutral" size="s" on:click={reset}>
        Reset
      </wa-button>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button variant="brand" appearance="filled" size="s"
                 disabled={!canApply} on:click={apply}>Apply</wa-button>
    </div>
  </div>
  </div>
  {/if}
</div>

{#if loading}
  <LoadingState label="Loading player statistics" />
{:else if error !== null}
  <ErrorState {error} retry={() => loadReport(filters)} />
{:else if report === null}
  <EmptyState title="Pick people or a game"
              description="Player Stats compares the people you choose, or reports on one game. Select at least one person or a game, then press Apply." />
{:else if report.group.sessions === 0}
  <EmptyState title="No sessions match"
              description="No session reports match these filters. Try a wider date range, include learning games, or clear a filter.">
    <svelte:fragment slot="action">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button size="s" appearance="outlined" on:click={reset}>Clear filters</wa-button>
    </svelte:fragment>
  </EmptyState>
{:else}
  <div aria-live="polite" class="visually-spaced">
    {#if gameOnly}
      <div class="stats-summary">
        <SummaryGrid>
          <SummaryCard label="Plays" value={number(report.group.sessions)} note="matching sessions" />
          <SummaryCard label="Players" value={number(report.players.length)} note="distinct people" />
          <SummaryCard label="Decided" value={number(report.group.decidedSessions)} note="sessions with a winner" />
          <SummaryCard label="Avg time" value={minutes(report.group.avgDurationMinutes)} note="closed sessions" />
          <SummaryCard label="Min time" value={minutes(report.group.minDurationMinutes)} note="fastest play" />
          <SummaryCard label="Max time" value={minutes(report.group.maxDurationMinutes)} note="longest play" />
        </SummaryGrid>
      </div>

      <div class="stats-columns">
        <Panel title="Player rankings" note={`${report.scope.game.name} · selected dates`} flush>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Player</th><th class="num">Plays</th><th class="num">Wins</th><th class="num">Win %</th><th class="num">Share</th></tr>
              </thead>
              <tbody>
                {#each report.players as person (person.key)}
                  <tr>
                    <td data-label="Player"><span class="person-name">{person.name ?? personName(person.key)}</span></td>
                    <td class="num" data-label="Plays">{number(person.plays)}</td>
                    <td class="num" data-label="Wins">{number(person.wins)}</td>
                    <td class="num" data-label="Win %">{pct(person.winPct)}</td>
                    <td class="num" data-label="Share">{pct(person.sharePct)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class="table-note">
            {number(report.players.reduce((total, person) => total + person.plays, 0))} player appearances across {number(report.group.sessions)} plays.
          </p>
        </Panel>

        <div class="range-card">
          <span class="range-eyebrow">Plays per player</span>
          <div class="range-grid">
            <div class="range-cell">
              <span class="range-label">Min</span>
              <strong>{number(playsMin)}</strong>
            </div>
            <div class="range-cell">
              <span class="range-label">Avg</span>
              <strong>{playsAvg === null ? '—' : playsAvg.toFixed(1)}</strong>
            </div>
            <div class="range-cell">
              <span class="range-label">Max</span>
              <strong>{number(playsMax)}</strong>
            </div>
          </div>
          <div class="range-divider"></div>
          <span class="range-eyebrow">Session length</span>
          <p class="range-summary">
            <strong>{minutes(report.group.avgDurationMinutes)}</strong> average ·
            {minutes(report.group.minDurationMinutes)}–{minutes(report.group.maxDurationMinutes)}
          </p>
          <p class="range-note">Duration uses session start and end. Sessions that ended at or before they started are ignored.</p>
        </div>
      </div>
    {:else}
      <div class="stats-summary">
        <SummaryGrid>
          <SummaryCard label="Sessions" value={number(report.group.sessions)} note="all matching reports" />
          <SummaryCard label="Player plays" value={number(report.group.appearances)} note="player appearances" />
          <SummaryCard label="Decided" value={number(report.group.decidedSessions)} note="wins + losses" />
          <SummaryCard label="Avg game" value={minutes(report.group.avgDurationMinutes)} note="closed sessions" />
          <SummaryCard label="Start player" value={pct(report.group.seatWinPct)}
                       note={`${number(report.group.seatWins)} of ${number(report.group.seatSessions)} decided`} />
          <SummaryCard label="Learning" value={number(report.group.learningExcluded)} note="excluded" />
        </SummaryGrid>
      </div>

      <div class="stats-columns">
        <Panel title="Player comparison" note="Decided multiplayer games" flush>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Player</th><th class="num">Plays</th><th class="num">Wins</th>
                  <th class="num">Win %</th><th class="num">As starter</th><th class="num">Otherwise</th>
                </tr>
              </thead>
              <tbody>
                {#each report.players as person (person.key)}
                  <tr>
                    <td data-label="Player"><span class="person-name">{person.name ?? personName(person.key)}</span></td>
                    <td class="num" data-label="Plays">{number(person.plays)}</td>
                    <td class="num" data-label="Wins">{number(person.wins)}</td>
                    <td class="num" data-label="Win %">{pct(person.winPct)}</td>
                    <td class="num" data-label="As starter">{pct(person.starterWinPct)}</td>
                    <td class="num" data-label="Otherwise">{pct(person.nonStarterWinPct)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class="table-note">
            Ties count as a win for every winner. Sessions with no winner or no recorded starter are excluded from the affected rate.
          </p>
        </Panel>

        <div class="seat-card">
          <span class="range-eyebrow">Seat effect</span>
          <strong class="seat-value">{pct(report.group.seatWinPct)}</strong>
          <span class="seat-caption">start player win rate</span>
          <span class="range-note">{number(report.group.seatWins)} of {number(report.group.seatSessions)} decided games</span>
          <div class="range-divider"></div>
          {#each report.players as person (person.key)}
            <div class="seat-row">
              <span>{person.name ?? personName(person.key)}</span>
              <span class="muted">{pct(person.starterWinPct)} / {pct(person.nonStarterWinPct)}</span>
            </div>
          {/each}
          <span class="range-note">Starter vs. otherwise.</span>
        </div>
      </div>

      {#if report.scope.game === null}
        <Panel title="Most played games" note="Across the selected people" flush>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Game</th><th class="num">Plays</th><th class="num">Players</th><th class="num">Avg time</th><th>Last played</th></tr>
              </thead>
              <tbody>
                {#each report.games as game (game.gameId)}
                  <tr>
                    <td data-label="Game"><a class="person-name" href={`#/game/${game.slug}`}>{game.name}</a></td>
                    <td class="num" data-label="Plays">{number(game.plays)}</td>
                    <td class="num" data-label="Players">{number(game.distinctPlayers)}</td>
                    <td class="num" data-label="Avg time">{minutes(game.avgDurationMinutes)}</td>
                    <td data-label="Last played">{day(game.lastPlayed)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </Panel>
      {/if}
    {/if}

    {#if report.warnings.length > 0}
      <ul class="warnings">
        {#each report.warnings as warning (warning.code)}
          <li>{warningText(warning)}</li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}


<style>
  .filters-panel {
    margin-bottom: var(--app-page-head-margin);
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-lowered);
    overflow: hidden;
  }

  .filters-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px var(--app-panel-body-padding);
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .filters-toggle:hover {
    background: var(--wa-color-surface-default);
  }

  .filters-toggle:focus-visible {
    outline: 2px solid var(--wa-color-brand-border-loud);
    outline-offset: -2px;
  }

  .filters-title {
    font-weight: var(--wa-font-weight-semibold);
  }

  .filters-summary {
    min-width: 0;
    overflow: hidden;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .filters-chevron {
    flex: 0 0 auto;
    width: 7px;
    height: 7px;
    margin-left: auto;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(45deg);
    transition: transform var(--wa-transition-normal);
  }

  .filters-toggle[aria-expanded="true"] .filters-chevron {
    transform: rotate(-135deg);
  }

  .filters-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px var(--app-panel-body-padding) var(--app-panel-body-padding);
    border-top: 1px solid var(--wa-color-surface-border);
  }

  .filter-grid {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 12px;
  }

  .field {
    flex: 0 1 150px;
    min-width: 0;
  }

  .field.grow {
    flex: 1 1 240px;
  }

  .switch-field {
    display: flex;
    align-items: center;
    min-height: 40px;
    flex: 0 1 auto;
  }

  .filter-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .filter-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-left: auto;
  }

  .filter-warning {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 8px 12px;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-s);
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  /* The persistent sidebar leaves about 538px of content at a 768px viewport. A
     160px card minimum keeps six summary cards at three across instead of
     letting them collapse to two. Wider desktop windows use the shared default
     and fit all six on one row. */
  @media (min-width: 1024px) and (max-width: 1199px) {
    .stats-summary {
      --app-summary-min: 210px;
    }
  }

  @media (min-width: 721px) and (max-width: 1023px) {
    .stats-summary {
      --app-summary-min: 160px;
    }
  }

  @media (max-width: 720px) {
    .stats-summary {
      --app-summary-min: 200px;
    }
  }

  .stats-columns {
    display: flex;
    align-items: flex-start;
    gap: var(--app-summary-gap);
    margin-bottom: var(--app-page-head-margin);
  }

  .stats-columns > :global(.panel) {
    flex: 1 1 0;
    min-width: 0;
  }

  .table-wrap {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--wa-font-size-s);
  }

  .data-table th,
  .data-table td {
    padding: 8px 16px;
    text-align: left;
    vertical-align: middle;
  }

  .data-table th {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-2xs, 0.75rem);
    font-weight: var(--wa-font-weight-semibold);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .data-table tbody tr + tr {
    border-top: 1px solid var(--wa-color-surface-border);
  }

  .data-table .num {
    text-align: right;
    white-space: nowrap;
  }

  .person-name {
    font-weight: var(--wa-font-weight-semibold);
  }

  .table-note {
    margin: 0;
    padding: 10px 16px;
    border-top: 1px solid var(--wa-color-surface-border);
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    line-height: 1.4;
  }

  .seat-card,
  .range-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 0 1 300px;
    min-width: 0;
    padding: var(--app-panel-body-padding);
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-lowered);
  }

  .range-card {
    flex: 1 1 260px;
  }

  .range-eyebrow {
    color: var(--wa-color-text-link);
    font-size: var(--wa-font-size-2xs, 0.75rem);
    font-weight: var(--wa-font-weight-semibold);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .seat-value {
    font-size: var(--wa-font-size-2xl, 2rem);
    line-height: 1.1;
  }

  .seat-caption {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  .seat-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    font-size: var(--wa-font-size-s);
  }

  .range-divider {
    height: 1px;
    margin: 6px 0;
    background: var(--wa-color-surface-border);
  }

  .range-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .range-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    border-radius: var(--wa-border-radius-s);
    background: var(--wa-color-surface-raised);
  }

  .range-label {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-2xs, 0.75rem);
    text-transform: uppercase;
  }

  .range-summary {
    margin: 0;
    font-size: var(--wa-font-size-s);
  }

  .range-note {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    line-height: 1.4;
  }

  .warnings {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding-left: 18px;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    line-height: 1.4;
  }

  .visually-spaced {
    display: flex;
    flex-direction: column;
    gap: var(--app-page-head-margin);
  }

  @media (max-width: 1100px) {
    .stats-columns {
      flex-direction: column;
    }

    .stats-columns > :global(.panel) {
      flex: 1 1 auto;
      width: 100%;
    }

    .seat-card,
    .range-card {
      flex: 1 1 auto;
      width: 100%;
    }
  }

  @media (max-width: 1023px) {
    .field {
      flex: 1 1 160px;
    }

    .field.grow {
      flex: 1 1 260px;
    }
  }

  @media (max-width: 720px) {
    .field {
      flex: 1 1 100%;
    }

    .switch-field {
      flex: 1 1 100%;
    }

    .table-wrap {
      overflow-x: visible;
    }

    .data-table thead {
      display: none;
    }

    .data-table,
    .data-table tbody,
    .data-table tr,
    .data-table td {
      display: block;
      width: 100%;
    }

    .data-table tbody tr {
      padding: 10px 16px;
    }

    .data-table tbody tr + tr {
      border-top: 1px solid var(--wa-color-surface-border);
    }

    .data-table td {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      padding: 3px 0;
      text-align: right;
    }

    .data-table td::before {
      content: attr(data-label);
      color: var(--wa-color-text-quiet);
      font-size: var(--wa-font-size-2xs, 0.75rem);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      text-align: left;
    }

    .data-table td:first-child {
      margin-bottom: 4px;
      font-size: var(--wa-font-size-m);
    }

    .data-table td:first-child::before {
      display: none;
    }
  }
</style>
