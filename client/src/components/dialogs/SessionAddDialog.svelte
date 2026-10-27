<script>
  import { DateTime, Interval } from 'luxon';

  import { api } from '$api';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Whether the dialog is currently presented.
  export let open = false;

  // The session report to edit, or null to create a new one. The presence of a
  // record is what puts the dialog into edit mode.
  export let session = null;

  // ---------------------------------------------------------------------------

  // This dialog is a work in progress: it lays out the shape of a session
  // report (see NewSessionReportSchema on the service) but saving is not wired
  // up yet, so the record cannot be created or changed from here.

  // Fired when the dialog closes; the detail is { result } where result is the
  // new or updated report on success or null on cancellation.
  export let onclose = undefined;

  // The ways a game can be played, as the API enumerates them.
  const playTypes = [
    { value: 'cardboard',       label: 'Cardboard' },
    { value: 'boardgamearena',  label: 'Board Game Arena' },
    { value: 'steam',           label: 'Steam' },
    { value: 'gog',             label: 'GOG' },
    { value: 'android',         label: 'Android' },
  ];

  // The mode the dialog is operating in, derived from whether we were handed a
  // record to edit.
  $: editing = (session !== null && session !== undefined);

  // A pristine form; the shape mirrors NewSessionReportSchema so that the
  // eventual save is a straight object build. Players are held as the three
  // pickers' selections plus the key of whoever started the game; the save
  // collapses that into the users/guests player lists the schema wants.

  // Player keys are 'u:<userId>', 'g:<guestId>' and 'n:<name>' for users, known
  // guests and newly named guests respectively.
  const blankForm = () => ({
    gameId: null,
    gameName: '',
    image: '',
    playType: 'cardboard',
    sessionBegin: '',
    sessionEnd: '',
    isLearning: false,
    title: '',
    content: '',
    users: [],
    guests: [],
    newGuests: [],
    startingKey: null
  });

  let form = blankForm();

  // The reference lists used to populate the pickers, gathered when the dialog
  // opens. These are read only queries -- nothing here ever writes.
  let games = [];
  let users = [];
  let knownGuests = [];

  // The game combobox element, so that its data source and displayed text can
  // be managed around the form state.
  let gameBox = null;

  // Ensure we only report a close once, no matter how the dialog goes away.
  let settled = false;

  $: if (open === true) {
    settled = false;
  }

  const settle = detail => {
    if (settled === false) {
      settled = true;
      onclose?.(detail);
    }
  };

  // Abort the dialog, returning back that no operation took place.
  const abort = () => settle({ result: null });

  // Close only when the dialog itself hides (escape, overlay click); the
  // selects inside of us emit hide events of their own when their dropdowns
  // close, and those bubble up here without meaning the dialog is going away.
  const dismissed = event => {
    if (event.target === event.currentTarget) {
      abort();
    }
  };

  // Keep a form control's value up to date regardless of which change style
  // the underlying component fires.
  const type = (target, set) => set(target.value);
  const pick = (target, set) => set(target.value);

  // ---------------------------------------------------------------------------

  // The combobox data source; the control calls this with the typed query and
  // displays exactly what we return, so the game list is filtered as the user
  // types instead of scrolling through every game in the system.
  const dataSource = async ({ query }) => {
    const needle = (query ?? '').trim().toLowerCase();

    return games
      .filter(game => needle === '' || (game.name ?? '').toLowerCase().includes(needle))
      .slice(0, 50)
      .map(game => {
        const element = document.createElement('wa-option');
        element.setAttribute('value', String(game.id));
        element.setAttribute('label', game.name);
        element.textContent = game.name;
        return element;
      });
  };

  // Hand the data source to the control as soon as it exists.
  $: if (gameBox !== null) {
    gameBox.dataSource = dataSource;
  }

  // A game is picked from the combobox; its value is the game id. The chosen
  // game's box art rides along as the report's thumbnail (a stand in for the
  // arbitrary images a session report may support in the future).
  const gamePicked = event => {
    const value = event.target.value;
    form.gameId = (value === '' || value === null) ? null : Number(value);
    form.image = games.find(game => game.id === form.gameId)?.imagePath ?? '';
  };

  // ---------------------------------------------------------------------------

  // The single player list that the pickers currently describe: known users,
  // known guests and newly named guests, each keyed for the starting player
  // selection.
  const labelOf = (list, id, fallback) =>
    list.find(entry => String(entry.id) === String(id))?.name ?? fallback;

  $: playerRows = [
    ...form.users.map(id => ({ key: `u:${id}`, label: labelOf(users, id, `user ${id}`) })),
    ...form.guests.map(id => ({ key: `g:${id}`, label: labelOf(knownGuests, id, `guest ${id}`) })),
    ...form.newGuests.map(name => ({ key: `n:${name}`, label: name }))
  ];

  // The starting player is one of the chosen players. This derived value is
  // what the select displays: a choice that points at a player who has since
  // been removed simply falls back to nothing. It is derived rather than
  // cleared back into the form, because a reactive statement that writes the
  // state it depends on (playerRows depends on form) is a reactive cycle.
  $: startingKey = playerRows.some(row => row.key === form.startingKey) ? form.startingKey : null;

  // ---------------------------------------------------------------------------

  // The session duration, computed live from the two date fields. It is only
  // listed when the session has an end that is after its beginning; without an
  // end date the session is still running and there is no length to show.
  $: durationText = (() => {
    if (form.sessionBegin === '' || form.sessionEnd === '') {
      return null;
    }

    const begin = DateTime.fromISO(form.sessionBegin);
    const end = DateTime.fromISO(form.sessionEnd);

    if (begin.isValid === false || end.isValid === false || end <= begin) {
      return null;
    }

    let duration = Interval.fromDateTimes(begin, end).toDuration(['minutes']);
    if (duration.minutes > 60) {
      duration = duration.shiftTo('hours', 'minutes');
    }

    return duration.toHuman({ unitDisplay: 'short' });
  })();

  // ---------------------------------------------------------------------------

  // Convert an ISO timestamp (or an already parsed DateTime) into the local
  // format that a datetime-local input wants, or '' when there is none.
  const toLocalInput = value => {
    const dt = DateTime.isDateTime(value) ? value : DateTime.fromISO(value ?? '');
    return dt.isValid ? dt.toFormat("yyyy-MM-dd'T'HH:mm") : '';
  };

  // Normalize an existing session report into the same form. Note that the
  // details API carries guests in the same list as users (a guest's id arrives
  // in the userId slot, with isUser telling the two apart).
  const fromSession = record => {
    const next = blankForm();

    next.gameId = record.gameId ?? null;
    next.gameName = record.name ?? '';
    next.image = record.imagePath ?? '';
    next.playType = record.playType ?? 'cardboard';
    next.sessionBegin = toLocalInput(record.sessionBegin);
    next.sessionEnd = toLocalInput(record.sessionEnd);
    next.isLearning = record.isLearning === true;
    next.title = record.title ?? '';
    next.content = record.content ?? '';

    for (const player of (record.players ?? [])) {
      const isUser = Boolean(player.isUser);

      if (isUser === true) {
        next.users.push(String(player.userId));
      }
      else {
        next.guests.push(String(player.userId));
      }

      if (player.isStartingPlayer === true) {
        next.startingKey = `${isUser ? 'u' : 'g'}:${player.userId}`;
      }
    }

    return next;
  };

  // Gather the reference lists, then populate the form for the mode we are
  // opening in.
  const populate = async () => {
    [games, users, knownGuests] = await Promise.all([
      api.game.list(),
      api.user.list(),
      api.guest.list()
    ]);

    form = (editing === true) ? fromSession(session) : blankForm();

    // The combobox shows the picked game's name; in add mode it starts empty
    // and the value only lands once the user picks something.
    if (gameBox !== null) {
      gameBox.value = (form.gameId === null) ? '' : String(form.gameId);
      gameBox.inputValue = (editing === true) ? form.gameName : '';
    }
  };

  // Only repopulate on the transition to open, so that editing a field does
  // not re-trigger the load.
  let wasOpen = false;
  $: if (open !== wasOpen) {
    wasOpen = open;

    if (open === true) {
      populate();
    }
  }
</script>

<wa-dialog class="session-dialog" {open}
           label={editing ? 'Edit Session Report' : 'Add Session Report'}
           style="--width: min(800px, 92vw)"
           on:wa-hide={dismissed}>
  <h3 slot="header">{editing ? 'Edit Session Report' : 'Add Session Report'}</h3>

  <!-- In edit mode most of the report is fixed by the API; say so once, up
       front, where every tab can see it. -->
  {#if editing}
    <div class="edit-note">
      Only the end time, learning flag, title and content can be changed; the
      game, players and start time are fixed once a report is filed.
    </div>
  {/if}

  <wa-tab-group>
    <wa-tab slot="nav" panel="info">Game Info</wa-tab>
    <wa-tab slot="nav" panel="play">Play Info</wa-tab>
    <wa-tab slot="nav" panel="details">Details</wa-tab>

    <!-- What was played, how, and whether it counted as a learning game. -->
    <wa-tab-panel name="info">
      <div class="stack">
        <!-- The game is a type ahead over the known game list, so a game can
             be found by typing part of its name instead of scrolling. The
             thumbnail at the end shows the chosen game's box art. -->
        <div class="game-row">
          <wa-combobox bind:this={gameBox}
                       label="Game" placeholder="Type a game name…"
                       disabled={editing}
                       on:change={gamePicked}>
            <span slot="no-results">No games match</span>
          </wa-combobox>

          {#if form.image !== ''}
            <img class="thumb" src={form.image} alt={form.gameName} title={form.gameName} />
          {/if}
        </div>

        <wa-select label="Play Type" value={form.playType} disabled={editing}
                   on:input={e => pick(e.target, v => form.playType = v)}
                   on:change={e => pick(e.target, v => form.playType = v)}>
          {#each playTypes as entry (entry.value)}
            <wa-option value={entry.value}>{entry.label}</wa-option>
          {/each}
        </wa-select>

        <wa-switch checked={form.isLearning}
                   on:change={e => form.isLearning = e.target.checked}>
          Learning game
        </wa-switch>

        <div class="muted">
          Learning games are excluded from some statistics, such as average
          game length and aggregate scores.
        </div>
      </div>
    </wa-tab-panel>

    <!-- When the game happened and who was there. -->
    <wa-tab-panel name="play">
      <div class="stack">
        <div class="date-row">
          <wa-input label="Session Begin" type="datetime-local" value={form.sessionBegin}
                    disabled={editing}
                    on:input={e => type(e.target, v => form.sessionBegin = v)}
                    on:change={e => type(e.target, v => form.sessionBegin = v)}></wa-input>

          <wa-input label="Session End" type="datetime-local" value={form.sessionEnd}
                    on:input={e => type(e.target, v => form.sessionEnd = v)}
                    on:change={e => type(e.target, v => form.sessionEnd = v)}></wa-input>
        </div>

        <!-- The length of the session, listed under the dates as soon as an
             end date makes it computable; the line is always reserved so that
             the notes below do not jump around while typing. -->
        <div class="duration-line">
          {#if durationText !== null}
            <wa-tag variant="brand">Duration: {durationText}</wa-tag>
          {/if}
        </div>

        <!-- The note spans the full width under both date fields. -->
        <div class="date-note">
          A session with no end date is treated as ongoing.
        </div>

        <wa-divider></wa-divider>

        <strong>Players</strong>
        <div class="muted">
          At least one player is required. Guests are matched by name, so
          people that have played before can simply be picked again; names
          entered under new guests are added to the guest book when the report
          is saved.
        </div>

        <div class="stats">
          <wa-select multiple label="Users" value={form.users} disabled={editing}
                     on:input={e => form.users = e.target.value ?? []}
                     on:change={e => form.users = e.target.value ?? []}>
            {#each users as entry (entry.id)}
              <wa-option value={String(entry.id)}>{entry.displayName ?? entry.name}</wa-option>
            {/each}
          </wa-select>

          <wa-select multiple label="Guests" value={form.guests} disabled={editing}
                     on:input={e => form.guests = e.target.value ?? []}
                     on:change={e => form.guests = e.target.value ?? []}>
            {#each knownGuests as entry (entry.id)}
              <wa-option value={String(entry.id)}>{entry.name}</wa-option>
            {/each}
          </wa-select>
        </div>

        <wa-tag-input label="New guests" placeholder="Guest name"
                      value={form.newGuests} disabled={editing}
                      on:input={e => form.newGuests = e.target.value ?? []}
                      on:change={e => form.newGuests = e.target.value ?? []}
                      on:wa-input={e => form.newGuests = e.target.value ?? []}></wa-tag-input>

        <!-- Who took the first turn; the schema's per player isStartingPlayer
             flag is what this collapses down to at save time. -->
        <wa-select label="Starting player" value={startingKey ?? ''}
                   placeholder="Not recorded" disabled={editing}
                   on:input={e => form.startingKey = (e.target.value === '') ? null : e.target.value}
                   on:change={e => form.startingKey = (e.target.value === '') ? null : e.target.value}>
          {#each playerRows as row (row.key)}
            <wa-option value={row.key}>{row.label}</wa-option>
          {/each}
        </wa-select>
      </div>
    </wa-tab-panel>

    <!-- The write up: what happened at the table. -->
    <wa-tab-panel name="details">
      <div class="stack">
        <wa-input label="Title" value={form.title}
                  on:input={e => type(e.target, v => form.title = v)}
                  on:change={e => type(e.target, v => form.title = v)}></wa-input>

        <wa-textarea label="Content" rows="10" value={form.content}
                     on:input={e => type(e.target, v => form.content = v)}
                     on:change={e => type(e.target, v => form.content = v)}></wa-textarea>
      </div>
    </wa-tab-panel>
  </wa-tab-group>

  <div slot="footer" class="edit-actions">
    <wa-callout variant="warning" class="wip">
      Work in progress -- saving is not implemented yet.
    </wa-callout>

    <div class="row">
      <!-- wa-button wraps a real <button>; the a11y warnings are false positives. -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="outlined" variant="neutral" on:click={abort}>Cancel</wa-button>
      <wa-button appearance="filled" variant="brand" disabled>
        {editing ? 'Save Changes' : 'Add Session Report'}
      </wa-button>
    </div>
  </div>
</wa-dialog>


<!-- *********************************************************************** -->


<style>
  /* The dialog holds a fixed share of the viewport no matter which tab is
     active: the title, the tab strip and the footer buttons stay put and only
     the tab content scrolls. */
  .session-dialog::part(dialog) {
    height: 75vh;
    max-height: 75vh;
    display: flex;
    flex-direction: column;
  }

  /* The body never scrolls itself; it hands its space to the tab group. */
  .session-dialog::part(body) {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .session-dialog wa-tab-group,
  .session-dialog wa-tab-group::part(base) {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* The one scroll bar: the tab panels' content area. */
  .session-dialog wa-tab-group::part(body) {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  /* The two date fields share a row as equal columns so that they line up
     regardless of their hints. */
  .date-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  /* The duration chip's line is reserved whether or not the chip is there, so
     nothing below it moves while the dates are being filled in. */
  .duration-line {
    min-height: 24px;
    display: flex;
    align-items: center;
  }

  /* The informative notes use the same small, secondary text as the field
     hints elsewhere in the application (the hints render at the s size of
     the type scale). */
  .date-note,
  .edit-note {
    font-size: var(--wa-font-size-s);
    color: var(--wa-color-text-secondary);
  }

  /* The chosen game's thumbnail, bottom aligned with the game picker's
     control so that the two stay level regardless of label height. */
  .game-row {
    display: flex;
    align-items: flex-end;
    gap: 12px;
  }

  .game-row wa-combobox {
    flex: 1 1 auto;
    min-width: 0;
  }

  .thumb {
    width: 64px;
    height: 64px;
    object-fit: contain;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-small);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }

  .edit-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    flex-wrap: wrap;
  }

  /* The WIP admonition stays out of the way of the buttons themselves. */
  .edit-actions .wip {
    flex: 1 1 220px;
    font-size: var(--wa-font-size-small);
  }
</style>
