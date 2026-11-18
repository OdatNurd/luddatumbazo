<script>
  import { tick } from 'svelte';
  import { DateTime, Interval } from 'luxon';

  import { api } from '$api';
  import { people } from '$stores/people';
  import { sessionStatus } from '$stores/sessionStatus';
  import { foldText } from '$lib/text.js';

  import Icon from '$components/Icon.svelte';
  import { applyRichTextEditorStyles, loadRichTextEditor } from '$lib/richTextEditor.js';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Whether the dialog is currently presented.
  export let open = false;

  // The session report to edit, or null to create a new one. The presence of a
  // record is what puts the dialog into edit mode.
  export let session = null;

  // Optional starting values for a new report, applied over the blank form
  // when the dialog opens in add mode. This is how a game page can offer to
  // log a session with the game, start time and title already filled in.
  export let preset = null;

  // ---------------------------------------------------------------------------

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

  // A pristine form. Players are split into the three picker selections;
  // results are held separately by player key so that rows can be added and
  // removed without rebuilding a results array.
  //
  // For edit mode, playerIds maps each key to the stable SessionReportPlayer
  // row id the update API wants.
  //
  // Player keys are 'u:<userId>', 'g:<guestId>' and 'n:<name>' for users, known
  // guests and newly named guests respectively.
  const blankForm = () => ({
    gameId: null,
    gameName: '',
    image: '',
    playType: 'cardboard',
    sessionBegin: DateTime.now().toFormat("yyyy-MM-dd'T'HH:mm"),
    sessionEnd: '',
    isLearning: false,
    title: '',
    content: '',
    users: [],
    guests: [],
    newGuests: [],
    startingKey: null,
    playerIds: {},
    results: {}
  });

  let form = blankForm();

  // The reference game list used to populate the combobox. The people lists
  // come from the shared store, which loads them once for the whole page.
  let games = [];

  // UI state; loading covers the initial reference-data fetch, saving covers
  // the create/update request, and warning holds a validation or API error.
  let loading = false;
  let saving = false;
  let warning = null;

  // The game combobox element, so that its data source and displayed text can
  // be managed around the form state.
  let gameBox = null;

  // The main tab group defaults to Game Info whenever the dialog is populated.
  // The group is mounted while the dialog is hidden, so its own first-tab
  // activation can miss and leave every panel hidden. Clear and then set the
  // active panel after the form has rendered so the group's watcher runs.
  let tabGroup = null;
  const showInfoTab = async () => {
    await tick();

    if (tabGroup !== null) {
      tabGroup.active = '';
      await tick();
      tabGroup.active = 'info';
    }
  };

  // The rich text editor is loaded only when the Details tab is first shown, so
  // opening a report does not pull its large ProseMirror chunk into the initial
  // page bundle. It stays loaded for the life of the dialog so moving between
  // tabs after that is instant.
  let contentEditor = null;
  let editorReady = false;
  let editorLoading = false;
  let editorError = null;

  // The custom link editor replaces the editor's URL-only popover: a link in a
  // report needs both its label and its destination.
  let linkPopover = null;
  let linkTextField = null;
  let linkHrefField = null;
  let linkText = '';
  let linkHref = '';
  let linkWarning = null;
  let linkOpen = false;

  const loadEditor = async () => {
    if (editorReady === true || editorLoading === true) {
      return;
    }

    editorLoading = true;
    editorError = null;

    try {
      await loadRichTextEditor();
      await customElements.whenDefined('wa-rich-text-editor');
      editorReady = true;

      // Set the initial value after the element exists. This also marks the
      // existing report as the editor's default, so its dirty state is clear.
      await tick();
      if (contentEditor !== null) {
        applyRichTextEditorStyles(contentEditor);
        contentEditor.addEventListener('keydown', editorShortcut, true);
        contentEditor.value = form.content ?? '';
        contentEditor.defaultValue = form.content ?? '';
      }
    }
    catch (error) {
      editorError = error.message ?? 'Unable to load the rich text editor.';
    }
    finally {
      editorLoading = false;
    }
  };

  const outerTabShown = event => {
    // Only respond to the outer group's own tabs; a bubbled event from any
    // nested control must not trigger an editor load.
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.detail.name === 'details') {
      loadEditor();
    }
  };

  const contentChanged = event => {
    form.content = event.target.value ?? '';
  };

  // Find the href of a link at the current editor selection, if there is one.
  const selectedLinkHref = () => {
    const view = contentEditor?.view;
    if (view === null || view === undefined) {
      return '';
    }

    const state = view.state;
    const link = state.schema.marks.link;

    if (state.selection.empty === true) {
      const mark = state.doc.resolve(state.selection.from).marks(link)[0];
      return mark?.attrs.href ?? '';
    }

    let href = '';
    state.doc.nodesBetween(state.selection.from, state.selection.to, node => {
      if (href !== '') {
        return false;
      }

      const mark = node.marks.find(entry => entry.type === link);

      if (mark !== undefined) {
        href = mark.attrs.href ?? '';
        return false;
      }
    });

    return href;
  };

  const prepareLink = () => {
    linkWarning = null;
    linkText = contentEditor?.selectedText ?? '';
    linkHref = selectedLinkHref();
  };

  const showLinkEditor = async () => {
    prepareLink();
    await linkPopover?.show();
  };

  // Intercept the editor's built-in Mod-K shortcut so it opens the same
  // label-and-destination form as the toolbar action.
  const editorShortcut = event => {
    if ((event.ctrlKey === true || event.metaKey === true) &&
        event.altKey === false &&
        event.key.toLowerCase() === 'k') {
      event.preventDefault();
      event.stopPropagation();
      showLinkEditor();
    }
  };

  const linkShown = async () => {
    linkOpen = true;
    await tick();

    if (linkText === '') {
      linkTextField?.focus();
    }
    else {
      linkHrefField?.focus();
    }
  };

  const linkHidden = () => {
    linkOpen = false;
    linkWarning = null;
  };

  const cancelLink = async () => {
    await linkPopover?.hide();
    contentEditor?.focus();
  };

  const escapeHtml = text => text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const normalizeHref = value => {
    const href = String(value ?? '').trim();

    if (href === '') {
      return null;
    }

    if (href.startsWith('#/') || href.startsWith('/')) {
      return href;
    }

    if (/^(https?:\/\/|mailto:)/i.test(href)) {
      return href;
    }

    // Reject other schemes (javascript:, data:, ...) rather than letting a
    // pasted value become executable content.
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      return null;
    }

    // Be forgiving about a bare external host, the same way the old link
    // control treated a destination without a scheme.
    if (/\s/.test(href) === false && href.includes('.')) {
      return `https://${href}`;
    }

    return null;
  };

  const applyLink = async () => {
    if (contentEditor === null) {
      return;
    }

    const text = linkText.trim();
    if (text === '') {
      linkWarning = 'Enter the text to display for the link.';
      linkTextField?.focus();
      return;
    }

    const href = normalizeHref(linkHref);
    if (href === null) {
      linkWarning = 'Enter an internal address such as #/game/ark-nova, or a full external URL.';
      linkHrefField?.focus();
      return;
    }

    const selected = contentEditor.selectedText ?? '';
    let applied = false;

    // When the label is the selected text, applying the link mark preserves
    // any formatting already inside the selection. A changed label replaces
    // the selection with the new linked text.
    if (selected !== '' && selected === text) {
      applied = contentEditor.runCommand('link', { href });
    }

    if (applied === false) {
      contentEditor.insertHtml(`<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`);
    }

    await linkPopover?.hide();
    contentEditor.focus();
  };

  const linkFieldKeyDown = event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyLink();
    }
  };

  // The Markdown cheat sheet popover is anchored to its help button.
  let helpOpen = false;
  const helpShown = () => { helpOpen = true; };
  const helpHidden = () => { helpOpen = false; };

  // Ensure we only report a close once, no matter how the dialog goes away.
  let settled = false;

  $: users = $people.users;
  $: knownGuests = $people.guests;

  $: if (open === true) {
    settled = false;
    saving = false;
    warning = null;
    helpOpen = false;
  }

  const settle = detail => {
    if (settled === false) {
      settled = true;
      onclose?.(detail);
    }
  };

  // Abort the dialog, returning back that no operation took place.
  const abort = () => {
    if (saving === true) {
      return;
    }

    settle({ result: null });
  };

  // Close only when the dialog itself hides (escape, overlay click); the
  // selects inside of us emit hide events of their own when their dropdowns
  // close, and those bubble up here without meaning the dialog is going away.
  const dismissed = event => {
    if (event.target === event.currentTarget) {
      if (saving === true) {
        event.preventDefault();
        return;
      }

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
    const needle = foldText((query ?? '').trim());

    return games
      .filter(game => needle === '' || foldText(game.name).includes(needle))
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
    const game = games.find(entry => entry.id === Number(value));

    form.gameId = (value === '' || value === null) ? null : Number(value);
    form.gameName = game?.name ?? '';
    form.image = game?.imagePath ?? '';
  };

  // ---------------------------------------------------------------------------

  // Trim and de-duplicate the newly named guests; a person's name is what
  // identifies them, so repeating it in the tag input should not create two
  // rows or two guest records.
  $: newGuestNames = [...new Set(
    form.newGuests.map(name => (name ?? '').trim()).filter(name => name !== '')
  )];

  // The single player list that the pickers currently describe: known users,
  // known guests and newly named guests, each keyed for results and for the
  // starting player selection.
  const labelOf = (list, id, fallback) =>
    list.find(entry => String(entry.id) === String(id))?.displayName ??
    list.find(entry => String(entry.id) === String(id))?.name ??
    fallback;

  $: playerRows = [
    ...form.users.map(id => {
      const key = `u:${id}`;
      return {
        key,
        label: labelOf(users, id, `user ${id}`),
        playerId: form.playerIds[key] ?? null
      };
    }),
    ...form.guests.map(id => {
      const key = `g:${id}`;
      return {
        key,
        label: labelOf(knownGuests, id, `guest ${id}`),
        playerId: form.playerIds[key] ?? null
      };
    }),
    ...newGuestNames.map(name => ({
      key: `n:${name}`,
      label: name,
      playerId: null
    }))
  ];

  // The starting player is one of the chosen players. This derived value is
  // what the select displays: a choice that points at a player who has since
  // been removed simply falls back to nothing. It is derived rather than
  // cleared back into the form, because a reactive statement that writes the
  // state it depends on (playerRows depends on form) is a reactive cycle.
  $: startingKey = playerRows.some(row => row.key === form.startingKey) ? form.startingKey : null;

  // The results for a player; an untouched player has an empty score and has
  // not been marked as the winner.
  const resultOf = key => form.results[key] ?? { score: '', isWinner: false };

  const setResult = (key, changes) => {
    form.results = {
      ...form.results,
      [key]: { ...resultOf(key), ...changes }
    };
  };

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
      const key = `${isUser ? 'u' : 'g'}:${player.userId}`;

      if (isUser === true) {
        next.users.push(String(player.userId));
      }
      else {
        next.guests.push(String(player.userId));
      }

      next.playerIds[key] = player.playerId ?? null;
      next.results[key] = {
        score: (player.score === null || player.score === undefined) ? '' : String(player.score),
        isWinner: player.isWinner === true
      };

      if (player.isStartingPlayer === true) {
        next.startingKey = key;
      }
    }

    return next;
  };

  // Gather the reference lists, then populate the form for the mode we are
  // opening in. Games are fetched per open; people are cached by the store.
  let populateToken = 0;

  const populate = async () => {
    const token = ++populateToken;

    loading = true;
    warning = null;

    try {
      const [gameList] = await Promise.all([
        api.game.list(),
        people.ensure()
      ]);

      if (token !== populateToken) {
        return;
      }

      games = gameList;
      form = (editing === true) ? fromSession(session) : blankForm();

      // A preset lays its starting values over the blank form in add mode.
      if (editing !== true && preset !== null && preset !== undefined) {
        Object.assign(form, preset);
      }

      // The combobox shows the picked game's name; in add mode it starts empty
      // (unless a preset supplied the game) and the value only lands once the
      // user picks something.
      if (gameBox !== null) {
        gameBox.value = (form.gameId === null) ? '' : String(form.gameId);
        gameBox.inputValue = form.gameName ?? '';
      }

      // If the editor was opened while the populate request was still in
      // flight, adopt the loaded report's content now. This is deliberately
      // done here and when the editor first loads rather than through a
      // reactive value binding, which would write every keystroke back into
      // the editor and reset short-lived states such as an empty heading.
      if (editorReady === true && contentEditor !== null) {
        contentEditor.value = form.content ?? '';
        contentEditor.defaultValue = form.content ?? '';
      }
    }
    catch (error) {
      if (token === populateToken) {
        warning = error.message ?? 'unable to load the session form';
      }
    }
    finally {
      if (token === populateToken) {
        loading = false;
        await showInfoTab();
      }
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

  // ---------------------------------------------------------------------------

  // Split a guest name into the first/last fields the guest schema wants. A
  // single word is a first name with an empty last name; everything before the
  // last word becomes the first name. This mirrors how a person's name is
  // normally written in the household.
  const splitGuestName = name => {
    const parts = name.trim().split(/\s+/).filter(part => part !== '');

    if (parts.length === 0) {
      return { firstName: '', lastName: '' };
    }

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }

    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts[parts.length - 1]
    };
  };

  // Convert a local datetime-local value to the UTC ISO string the API schema
  // accepts. Returns null for a blank or invalid value.
  const toISO = value => {
    const dt = DateTime.fromISO(value);
    return dt.isValid ? dt.toUTC().toISO() : null;
  };

  // Validate the form, collecting the begin/end values that a save needs.
  const validate = () => {
    if (form.gameId === null || form.gameId === undefined) {
      return { error: 'Choose a game before saving.' };
    }

    const begin = toISO(form.sessionBegin);
    if (begin === null) {
      return { error: 'Enter a valid session begin time.' };
    }

    let end = null;
    if ((form.sessionEnd ?? '').trim() !== '') {
      end = toISO(form.sessionEnd);
      if (end === null) {
        return { error: 'Enter a valid session end time, or leave it blank.' };
      }

      if (DateTime.fromISO(end) < DateTime.fromISO(begin)) {
        return { error: 'The session end must not be before it begins.' };
      }
    }

    if (playerRows.length === 0) {
      return { error: 'Choose at least one player.' };
    }

    for (const row of playerRows) {
      const score = resultOf(row.key).score;
      if (String(score ?? '').trim() !== '' && Number.isFinite(Number(score)) === false) {
        return { error: `Enter a numeric score for ${row.label}.` };
      }

      if (editing === true && row.playerId === null) {
        return { error: `Unable to identify the saved player row for ${row.label}.` };
      }
    }

    return { begin, end };
  };

  // Build the player records shared by both the create and update payloads.
  const buildPlayers = () => {
    const starting = startingKey;
    const resultFor = key => {
      const result = resultOf(key);
      return {
        isStartingPlayer: key === starting,
        score: String(result.score ?? '').trim() === '' ? 0 : Number(result.score),
        isWinner: result.isWinner === true
      };
    };

    const users = form.users.map(id => ({
      userId: Number(id),
      ...resultFor(`u:${id}`)
    }));

    const guests = form.guests.map(id => {
      const key = `g:${id}`;
      const known = knownGuests.find(entry => String(entry.id) === String(id));
      const existing = (editing === true)
        ? (session.players ?? []).find(player => player.isUser === false &&
                                                    String(player.userId) === String(id))
        : null;

      const names = (known !== null && known !== undefined)
        ? { firstName: known.firstName, lastName: known.lastName }
        : splitGuestName(existing?.name ?? '');

      return {
        ...names,
        ...resultFor(key)
      };
    });

    for (const name of newGuestNames) {
      guests.push({
        ...splitGuestName(name),
        ...resultFor(`n:${name}`)
      });
    }

    return { users, guests };
  };

  // Set the end field to now without saving. The user can adjust the time (or
  // anything else) before pressing Save; an ordinary save with a blank end
  // leaves the session open.
  const finishSession = () => {
    form.sessionEnd = DateTime.now().toFormat("yyyy-MM-dd'T'HH:mm");
    warning = null;
  };

  // Save the report. Add mode creates a new one; edit mode PATCHes only the
  // editable fields, including results and the starting player.
  const save = async () => {
    if (saving === true || loading === true) {
      return;
    }

    const checked = validate();
    if (checked.error !== undefined) {
      warning = checked.error;
      return;
    }

    saving = true;
    warning = null;

    try {
      let result;

      if (editing === true) {
        const players = playerRows.map(row => ({
          playerId: row.playerId,
          ...resultOf(row.key),
          score: String(resultOf(row.key).score ?? '').trim() === ''
            ? 0
            : Number(resultOf(row.key).score),
          isStartingPlayer: row.key === startingKey
        }));

        result = await api.session.update(session.sessionId ?? session.id, {
          sessionEnd: checked.end,
          isLearning: form.isLearning,
          title: form.title,
          content: form.content,
          players
        });
      }
      else {
        result = await api.session.add({
          gameId: form.gameId,
          playType: form.playType,
          sessionBegin: checked.begin,
          sessionEnd: checked.end,
          isLearning: form.isLearning,
          title: form.title,
          content: form.content,
          players: buildPlayers()
        });
      }

      // Creating a report may have added guests; refresh the shared list so
      // they can be picked immediately next time. A failed refresh must not
      // turn a successful save into an apparent failure, so it is contained.
      if (editing === false && newGuestNames.length > 0) {
        try {
          await people.refresh();
        }
        catch {
          // The people store already records the error for a later retry.
        }
      }

      // The profile shortcut and open-session counts are advisory, but a save
      // is exactly the point at which they change. The status store records
      // its own failure and resolves, so this cannot mask a successful save.
      await sessionStatus.refresh();

      settle({ result });
    }
    catch (error) {
      warning = error.message ?? 'unable to save the session report';
    }
    finally {
      saving = false;
    }
  };

  // Whether this report is currently open. The details response carries isOpen;
  // the fallback also handles a raw record whose end is null.
  $: sessionIsOpen = editing === true &&
    (session.isOpen === true || session.sessionEnd === null || session.sessionEnd === undefined);

  // A blank title is filled by the server with "Play of <game name>". Show that
  // default while adding so the result of leaving the field empty is clear; an
  // existing report keeps whatever title it already has.
  $: titlePlaceholder = editing === true
    ? undefined
    : (form.gameName === '' ? 'Play of …' : `Play of ${form.gameName}`);
</script>

<wa-dialog class="session-dialog" {open}
           label={editing ? 'Edit Session Report' : 'Add Session Report'}
           style="--width: min(800px, 92vw)"
           on:wa-hide={dismissed}>
  <h3 slot="header">{editing ? 'Edit Session Report' : 'Add Session Report'}</h3>

  <!-- In edit mode not every field is writable; say so once, up front. -->
  {#if editing}
    <div class="edit-note">
      Not all fields can be edited after a report is filed.
    </div>
  {/if}

  {#if warning !== null}
    <wa-callout variant="warning">{warning}</wa-callout>
  {/if}

  <wa-tab-group bind:this={tabGroup} on:wa-tab-show={outerTabShown}>
    <wa-tab slot="nav" panel="info">Game Info</wa-tab>
    <wa-tab slot="nav" panel="play">Play Info</wa-tab>
    <wa-tab slot="nav" panel="results">Results</wa-tab>
    <wa-tab slot="nav" panel="details">Details</wa-tab>

    <!-- What was played, when it happened, and whether it counted as a learning game. -->
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
             the rest of the form does not jump around while typing. -->
        <div class="duration-line">
          {#if durationText !== null}
            <wa-tag variant="brand">Duration: {durationText}</wa-tag>
          {/if}
        </div>

        <div class="date-note">
          A session with no end date is treated as ongoing. Entering an end
          date closes it; clearing the end date reopens it.
        </div>

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

    <!-- Who was there. -->
    <wa-tab-panel name="play">
      <div class="stack">
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
                   placeholder="Not recorded"
                   on:input={e => form.startingKey = (e.target.value === '') ? null : e.target.value}
                   on:change={e => form.startingKey = (e.target.value === '') ? null : e.target.value}>
          {#each playerRows as row (row.key)}
            <wa-option value={row.key}>{row.label}</wa-option>
          {/each}
        </wa-select>
      </div>
    </wa-tab-panel>

    <!-- Scores and winners for each player. -->
    <wa-tab-panel name="results">
      <div class="stack">
        <strong>Results</strong>
        <div class="muted">
          Scores and winners can be changed on every save, including after
          the session is closed.
        </div>

        {#if playerRows.length > 0}
          <div class="result-list">
            {#each playerRows as row (row.key)}
              <div class="result-row">
                <div class="result-name">{row.label}</div>

                <wa-input type="number" label="Score" class="result-score"
                          value={resultOf(row.key).score}
                          on:input={e => setResult(row.key, { score: e.target.value })}
                          on:change={e => setResult(row.key, { score: e.target.value })}></wa-input>

                <wa-switch checked={resultOf(row.key).isWinner}
                           on:change={e => setResult(row.key, { isWinner: e.target.checked })}>
                  Winner
                </wa-switch>
              </div>
            {/each}
          </div>
        {:else}
          <div class="muted">Choose at least one player to record results.</div>
        {/if}
      </div>
    </wa-tab-panel>

    <!-- The write up: what happened at the table. -->
    <wa-tab-panel name="details">
      <div class="stack">
        <wa-input label="Title" value={form.title} placeholder={titlePlaceholder}
                  on:input={e => type(e.target, v => form.title = v)}
                  on:change={e => type(e.target, v => form.title = v)}></wa-input>

        <div class="content-editor">
          {#if editorReady}
            <!-- Disable the features the session renderer strips (images,
                 embeds, underline, highlight, color, alignment, sub/superscript).
                 Tables are not disabled: they render on the session page, so
                 existing reports that contain them must survive editing. -->
            <wa-rich-text-editor label="Content" format="markdown"
                                 placeholder="Write up what happened…"
                                 toolbar="block | bold italic strikethrough code | actions | bullet-list ordered-list blockquote | horizontal-rule | undo redo"
                                 disabled-features="image embed underline highlight color align subscript superscript"
                                 bind:this={contentEditor}
                                 on:input={contentChanged}
                                 on:change={contentChanged}>
              <!-- wa-button wraps a real <button>; the a11y warnings are false positives. -->
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <wa-button slot="actions" id="content-link" appearance="plain" size="s"
                         title="Insert link" aria-label="Insert link"
                         aria-haspopup="dialog" aria-expanded={linkOpen}
                         on:click={prepareLink}>
                <Icon name="link-45deg" />
              </wa-button>

              <wa-button slot="actions" id="content-help" appearance="plain" size="s"
                         title="Formatting help" aria-label="Formatting help"
                         aria-haspopup="dialog" aria-expanded={helpOpen}>
                <Icon name="question-circle-fill" />
              </wa-button>
            </wa-rich-text-editor>

            <wa-popover for="content-help" class="help-popover"
                        placement="left-start" distance="6"
                        on:wa-show={helpShown} on:wa-hide={helpHidden}>
              <div class="markdown-help">
                <div class="help-heading">
                  <strong>Formatting help</strong>
                  <span class="muted">Select text, then use the toolbar. Markdown block shortcuts work at the start of a line.</span>
                </div>

                <!-- Web Awesome's Markdown typing rules cover block structures
                     only. Do not list inline Markdown syntax here: bold, italic,
                     strikethrough, inline code, and links are toolbar-only. -->
                <div class="help-section">
                  <strong>Text formatting</strong>
                  <dl class="help-list">
                    <dt><code>Bold</code></dt><dd>Select text, then use the Bold button.</dd>
                    <dt><code>Italic</code></dt><dd>Select text, then use the Italic button.</dd>
                    <dt><code>Strikethrough</code></dt><dd>Select text, then use the Strikethrough button.</dd>
                    <dt><code>Code</code></dt><dd>Inline code: select text, then use the Code button.</dd>
                  </dl>
                </div>

                <div class="help-section">
                  <strong>Typing shortcuts</strong>
                  <dl class="help-list">
                    <dt><code># Heading</code></dt><dd>Heading level 1; use <code>##</code> or <code>###</code> for levels 2–3.</dd>
                    <dt><code>- item</code></dt><dd>Bulleted list</dd>
                    <dt><code>1. item</code></dt><dd>Numbered list</dd>
                    <dt><code>&gt; quote</code></dt><dd>Block quote</dd>
                    <dt><code>```</code></dt><dd>Code block</dd>
                    <dt><code>---</code></dt><dd>Horizontal rule</dd>
                  </dl>
                </div>

                <div class="help-section">
                  <strong>Links</strong>

                  <div class="help-example">
                    <code>Link button</code>
                    <span>Set the text and destination together. Selecting text first fills in the text.</span>
                  </div>

                  <div class="help-example">
                    <code>https://example.com</code>
                    <span>Type an external address and press Space to link it automatically.</span>
                  </div>
                </div>

                <div class="help-section">
                  <strong>Internal short links</strong>

                  <div class="help-example">
                    <code>#/game/&lt;slug&gt;</code>
                    <span>Game page, for example <code>#/game/ark-nova</code>.</span>
                  </div>

                  <div class="help-example">
                    <code>#/session/&lt;id&gt;</code>
                    <span>Session report, for example <code>#/session/249</code>.</span>
                  </div>

                  <dl class="help-list help-targets">
                    <dt><code>#/category/&lt;slug&gt;</code></dt><dd>Category</dd>
                    <dt><code>#/mechanic/&lt;slug&gt;</code></dt><dd>Mechanic</dd>
                    <dt><code>#/designer/&lt;slug&gt;</code></dt><dd>Designer</dd>
                    <dt><code>#/artist/&lt;slug&gt;</code></dt><dd>Artist</dd>
                    <dt><code>#/publisher/&lt;slug&gt;</code></dt><dd>Publisher</dd>
                  </dl>

                  <div class="muted help-note">
                    Put one of these in the Destination field; they do not turn
                    into links on their own. These are short hash routes, not
                    web addresses outside the app. External links open in a new
                    tab.
                  </div>
                </div>

                <div class="muted help-note">
                  Leave a blank line between paragraphs. Images are not
                  supported; tables already in a report are kept when it is
                  edited.
                </div>
              </div>
            </wa-popover>

            <wa-popover bind:this={linkPopover} for="content-link" class="link-popover"
                        placement="left-start" distance="6"
                        on:wa-show={linkShown} on:wa-hide={linkHidden}>
              <div class="link-form">
                <div class="help-heading">
                  <strong>Insert link</strong>
                  <span class="muted">The link text is what appears in the report.</span>
                </div>

                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <wa-input bind:this={linkTextField} size="s"
                          label="Link text" value={linkText} placeholder="Ark Nova"
                          on:input={e => linkText = e.target.value}
                          on:change={e => linkText = e.target.value}
                          on:keydown={linkFieldKeyDown}></wa-input>

                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <wa-input bind:this={linkHrefField} size="s"
                          label="Destination" value={linkHref}
                          placeholder="#/game/ark-nova or https://example.com"
                          on:input={e => linkHref = e.target.value}
                          on:change={e => linkHref = e.target.value}
                          on:keydown={linkFieldKeyDown}></wa-input>

                <div class="muted link-note">
                  Game: <code>#/game/&lt;slug&gt;</code> · Session:
                  <code>#/session/&lt;id&gt;</code> · External:
                  <code>https://…</code>
                </div>

                {#if linkWarning !== null}
                  <div class="link-warning" role="alert">{linkWarning}</div>
                {/if}

                <div class="link-actions">
                  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                  <wa-button size="s" appearance="outlined" variant="neutral"
                             on:click={cancelLink}>Cancel</wa-button>
                  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                  <wa-button size="s" appearance="filled" variant="brand"
                             on:click={applyLink}>Insert link</wa-button>
                </div>
              </div>
            </wa-popover>
          {:else if editorError !== null}
            <div class="editor-error" role="alert">
              <span>{editorError}</span>
              <!-- wa-button wraps a real <button>; the a11y warnings are false positives. -->
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <wa-button size="s" appearance="outlined" on:click={loadEditor} disabled={editorLoading}>
                Retry
              </wa-button>
            </div>
          {:else}
            <div class="editor-loading" role="status">Loading editor…</div>
          {/if}
        </div>
      </div>
    </wa-tab-panel>
  </wa-tab-group>

  <div slot="footer" class="edit-actions">
    <div class="row">
      <!-- wa-button wraps a real <button>; the a11y warnings are false positives. -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="outlined" variant="neutral" on:click={abort}
                 disabled={saving}>Cancel</wa-button>

      {#if sessionIsOpen}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button appearance="outlined" variant="brand" on:click={finishSession}
                   disabled={saving}>Finish Session</wa-button>
      {/if}

      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="filled" variant="brand" on:click={save}
                 loading={saving} disabled={saving || loading}>
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

  .session-dialog > wa-tab-group,
  .session-dialog > wa-tab-group::part(tab-group) {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* The one scroll bar: the outer tab panels' content area. */
  .session-dialog > wa-tab-group::part(body) {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;

    /* The scroll container is also the clip box; without padding the controls
       sit flush with its edge and the focus ring is cut off along the left and
       right sides. */
    padding: 6px;
  }

  /* The tab strip is a secondary affordance here: the fields are the task,
     and the dialog has a fixed height. Use smaller type and tighter padding so
     the chrome leaves more room for the active panel. */
  .session-dialog wa-tab {
    font-size: var(--wa-font-size-s);
  }

  .session-dialog wa-tab::part(tab) {
    padding: 0.4rem 0.85rem;
  }

  /* Web Awesome gives panels 32px of vertical padding. That is generous for a
     normal page but pushes the editor out of this height-constrained dialog,
     so start the content close to the tab strip instead. */
  .session-dialog > wa-tab-group > wa-tab-panel {
    --padding: var(--wa-space-s) 0 var(--wa-space-s);
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
    color: var(--wa-color-text-quiet);
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
    border-radius: var(--wa-border-radius-s);
  }

  /* The Details panel fills the space the dialog gives it, and the editor
     inside it grows into whatever remains after the title field. This keeps
     the write-up usefully tall without forcing the whole tab body to scroll. */
  :global(.session-dialog > wa-tab-group > wa-tab-panel[name="details"][active]) {
    box-sizing: border-box;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :global(.session-dialog > wa-tab-group > wa-tab-panel[name="details"][active]::part(tab-panel)) {
    box-sizing: border-box;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :global(.session-dialog > wa-tab-group > wa-tab-panel[name="details"][active] > .stack) {
    flex: 1 1 auto;
    min-height: 0;
  }

  /* The write-up grows into the space left after the title field. The editor
     host and its bordered box are both flex containers, so the editable
     region fills the available height and scrolls internally; the tab body
     takes over when the dialog itself is too short to show the full editor. */
  .content-editor {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 15em;
  }

  .content-editor wa-rich-text-editor {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 15em;
    --content-min-height: 10em;
  }

  .content-editor wa-rich-text-editor::part(rich-text-editor) {
    flex: 1 1 auto;
    min-height: 0;
  }

  .editor-loading {
    padding: 24px 0;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  .editor-error {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-s);
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  /* The cheat sheet is wider than the default popover and scrolls when the
     viewport is short. */
  .help-popover {
    --max-width: 30rem;
  }

  .help-popover::part(body) {
    width: min(30rem, 82vw);
    max-height: min(70vh, 34rem);
    overflow-y: auto;
  }

  .markdown-help {
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: var(--wa-font-size-s);
  }

  .help-heading,
  .help-section,
  .help-example {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .help-heading {
    gap: 2px;
  }

  .help-list {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 4px 12px;
    margin: 0;
  }

  .help-list dt,
  .help-list dd {
    margin: 0;
  }

  .help-list code,
  .help-example code {
    padding: 1px 5px;
    border-radius: var(--wa-border-radius-s);
    background: var(--wa-color-surface-lowered);
    font-family: var(--wa-font-family-code, monospace);
    font-size: 0.9em;
    overflow-wrap: anywhere;
  }

  .help-example > code {
    display: block;
    padding: 4px 6px;
  }

  .help-note {
    line-height: 1.45;
  }

  .help-targets {
    margin-top: 2px;
  }

  /* The link editor is a compact form rather than a cheat sheet. */
  .link-popover {
    --max-width: 27rem;
  }

  .link-popover::part(body) {
    width: min(27rem, 82vw);
    max-height: min(70vh, 26rem);
    overflow-y: auto;
    padding: var(--wa-space-m);
  }

  .link-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: var(--wa-font-size-s);
  }

  .link-note {
    line-height: 1.45;
  }

  .link-warning {
    color: var(--wa-color-danger-on-quiet);
    font-size: var(--wa-font-size-s);
  }

  .link-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 2px;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }

  /* One result per player: name, score and winner switch. */
  .result-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .result-row {
    display: grid;
    grid-template-columns: minmax(120px, 1fr) 120px max-content;
    align-items: end;
    gap: 12px;
  }

  .result-name {
    padding-bottom: 10px;
    font-weight: var(--wa-font-weight-semibold);
    overflow-wrap: anywhere;
  }

  .edit-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    width: 100%;
    flex-wrap: wrap;
  }
</style>
