<script>
  import { tick } from 'svelte';
  import { DateTime } from 'luxon';

  import { api } from '$api';

  import { people } from '$stores/people';
  import { user } from '$stores/user';

  import PageHead from '$components/PageHead.svelte';
  import Panel from '$components/Panel.svelte';
  import GameImage from '$components/GameImage.svelte';
  import IconButton from '$components/IconButton.svelte';
  import LoadingState from '$components/LoadingState.svelte';
  import ErrorState from '$components/ErrorState.svelte';
  import EmptyState from '$components/EmptyState.svelte';

  // ---------------------------------------------------------------------------
  // Local filter state
  // ---------------------------------------------------------------------------

  // The picker's state is deliberately local: unlike the stats report, it is a
  // transient question ("what can we play tonight?") rather than a view worth
  // linking. Saved filters arrive in the next phase.

  const blankFilters = () => ({
    players: { min: '', max: '' },
    time: { min: '', max: '' },
    complexity: { min: '', max: '' },
    categories: [],
    mechanics: [],
    history: {
      enabled: false,
      players: [],
      from: '',
      mode: 'exclude'
    }
  });

  let filters = blankFilters();
  let result = null;
  let searching = false;
  let error = null;
  let filtersOpen = true;
  let showAllMatches = false;

  let peopleError = null;
  let metadataError = null;
  let categories = [];
  let mechanics = [];

  let historyBox = null;
  let categoryBox = null;
  let mechanicBox = null;

  // Saved filters
  let savedFilters = [];
  let savedError = null;
  let loadedFilter = null;
  let dirty = false;
  let baseline = filters;
  let savedSelect = null;

  let saveOpen = false;
  let saveName = '';
  let saveError = null;
  let replaceId = null;
  let saving = false;

  let renameOpen = false;
  let renameName = '';
  let renameError = null;

  // Draft state is not cleared until the first hydration attempt finishes, so
  // the initial blank controls cannot overwrite a draft before it is restored.
  let hydrated = false;

  // A filter object is replaced, never mutated, so reference equality is enough
  // to know that the controls moved away from the loaded filter.
  $: if (filters !== baseline) {
    dirty = true;
  }

  const loadPeople = () => {
    peopleError = null;
    people.ensure().catch(failure => {
      peopleError = failure.message ?? 'unable to load the people lists';
    });
  };

  const loadMetadata = () => {
    metadataError = null;

    Promise.all([
      api.metadata.list('category'),
      api.metadata.list('mechanic')
    ])
      .then(([categoryList, mechanicList]) => {
        categories = categoryList;
        mechanics = mechanicList;
      })
      .catch(failure => {
        metadataError = failure.message ?? 'unable to load categories and mechanics';
      });
  };

  // Saved filters and draft state are hydrated at the bottom of this module,
  // once every helper they use has been defined.

  // ---------------------------------------------------------------------------
  // Derived values and validation
  // ---------------------------------------------------------------------------

  const num = value => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const boundError = bounds => {
    const min = num(bounds.min);
    const max = num(bounds.max);

    return min !== undefined && max !== undefined && min > max;
  };

  $: playersInvalid = boundError(filters.players);
  $: timeInvalid = boundError(filters.time);
  $: complexityInvalid = boundError(filters.complexity);
  $: historyInvalid = filters.history.enabled && filters.history.players.length === 0;
  $: valid = !playersInvalid && !timeInvalid &&
    !complexityInvalid && !historyInvalid;

  $: selectedHistory = filters.history.players;
  $: categoryValues = filters.categories.map(String);
  $: mechanicValues = filters.mechanics.map(String);

  const peopleOptions = () => [
    ...$people.users.map(person => ({
      key: `u:${person.id}`,
      name: person.displayName ?? person.name
    })),
    ...$people.guests.map(person => ({
      key: `g:${person.id}`,
      name: person.name
    }))
  ];

  const rangeLabel = (bounds, unit, options = {}) => {
    const min = num(bounds.min);
    const max = num(bounds.max);

    if (min === undefined && max === undefined) {
      return '';
    }

    if (min !== undefined && max !== undefined && min === max) {
      return `${min}${options.compact ? '' : ` ${unit}`}`;
    }

    if (min !== undefined && max !== undefined) {
      return `${min}–${max}${options.compact ? '' : ` ${unit}`}`;
    }

    return min !== undefined
      ? `${min}+${options.compact ? '' : ` ${unit}`}`
      : `up to ${max}${options.compact ? '' : ` ${unit}`}`;
  };

  const metadataName = (list, id) => list.find(entry => entry.id === id)?.name ?? '';

  $: activeChips = (() => {
    const chips = [];
    const players = rangeLabel(filters.players, filters.players.min === filters.players.max ? 'player' : 'players');
    const time = rangeLabel(filters.time, 'min');
    const weight = rangeLabel(filters.complexity, 'weight');

    if (players !== '') {
      chips.push(players);
    }
    if (time !== '') {
      chips.push(time);
    }
    if (weight !== '') {
      chips.push(`Weight ${weight}`);
    }
    if (filters.categories.length > 0) {
      chips.push(filters.categories
        .map(id => metadataName(categories, id))
        .filter(name => name !== '')
        .join(' · ') || `${filters.categories.length} categories`);
    }
    if (filters.mechanics.length > 0) {
      chips.push(filters.mechanics
        .map(id => metadataName(mechanics, id))
        .filter(name => name !== '')
        .join(' · ') || `${filters.mechanics.length} mechanics`);
    }
    if (filters.history.enabled) {
      chips.push(filters.history.mode === 'include' ? 'Played recently' : 'New to us');
      if (filters.history.from !== '') {
        chips.push(`since ${filters.history.from}`);
      }
    }

    return chips;
  })();

  $: activeSummary = activeChips.length === 0
    ? 'no filters'
    : activeChips.slice(0, 2).join(' · ');

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  const payload = () => {
    const bounds = window => {
      const next = {};
      const min = num(window.min);
      const max = num(window.max);

      if (min !== undefined) {
        next.min = min;
      }
      if (max !== undefined) {
        next.max = max;
      }

      return next;
    };

    return {
      version: 1,
      players: bounds(filters.players),
      time: bounds(filters.time),
      complexity: bounds(filters.complexity),
      categories: [...filters.categories],
      mechanics: [...filters.mechanics],
      history: {
        enabled: filters.history.enabled,
        players: [...filters.history.players],
        from: filters.history.from === '' ? undefined : filters.history.from,
        mode: filters.history.mode
      }
    };
  };

  const find = async (excludeGameId = undefined) => {
    if (valid === false) {
      return;
    }

    searching = true;
    error = null;

    try {
      result = await api.insights.picker.search(payload(), excludeGameId);
      showAllMatches = false;

      if (typeof window !== 'undefined' &&
          window.matchMedia('(max-width: 720px)').matches) {
        filtersOpen = false;
      }
    }
    catch (failure) {
      error = failure;
    }
    finally {
      searching = false;
    }
  };

  const pickAnother = () => {
    if (result?.picked) {
      find(result.picked.id);
    }
  };

  const resetComboboxText = () => {
    if (historyBox !== null) {
      historyBox.inputValue = '';
    }
    if (categoryBox !== null) {
      categoryBox.inputValue = '';
    }
    if (mechanicBox !== null) {
      mechanicBox.inputValue = '';
    }
  };

  const reset = () => {
    filters = blankFilters();
    baseline = filters;
    loadedFilter = null;
    dirty = false;
    result = null;
    error = null;
    showAllMatches = false;
    saveOpen = false;
    renameOpen = false;
    rememberSavedFilter(null);
    clearDraft();
    resetComboboxText();
  };

  const setHistoryPeople = keys => {
    filters = {
      ...filters,
      history: {
        ...filters.history,
        players: [...new Set(keys ?? [])]
      }
    };
  };

  const setHistoryEnabled = enabled => {
    filters = {
      ...filters,
      history: {
        ...filters.history,
        enabled
      }
    };
  };

  const setIds = (key, values) => {
    filters = {
      ...filters,
      [key]: (values ?? []).map(Number).filter(Number.isInteger)
    };
  };

  // ---------------------------------------------------------------------------
  // Saved filters
  // ---------------------------------------------------------------------------

  const textValue = value => (value === undefined || value === null)
    ? ''
    : String(value);

  const applyStoredFilter = saved => {
    const filter = saved.filter;

    if (filter === null || filter === undefined) {
      savedError = `the filter '${saved.name}' is unreadable; delete it and save a new one`;
      return;
    }

    const next = blankFilters();

    next.players = {
      min: textValue(filter.players?.min),
      max: textValue(filter.players?.max)
    };
    next.time = {
      min: textValue(filter.time?.min),
      max: textValue(filter.time?.max)
    };
    next.complexity = {
      min: textValue(filter.complexity?.min),
      max: textValue(filter.complexity?.max)
    };
    next.categories = [...(filter.categories ?? [])];
    next.mechanics = [...(filter.mechanics ?? [])];
    next.history = {
      enabled: filter.history?.enabled === true,
      players: [...(filter.history?.players ?? [])],
      from: textValue(filter.history?.from),
      mode: filter.history?.mode === 'include' ? 'include' : 'exclude'
    };

    filters = next;
    baseline = filters;
    loadedFilter = saved;
    dirty = false;
    result = null;
    error = null;
    showAllMatches = false;
    saveOpen = false;
    renameOpen = false;
    savedError = null;
    rememberSavedFilter(saved.name);
    resetComboboxText();
  };

  const selectSavedFilter = async filterId => {
    if (filterId === '' || filterId === undefined || filterId === null) {
      loadedFilter = null;
      dirty = false;
      baseline = filters;
      rememberSavedFilter(null);
      return;
    }

    const saved = savedFilters.find(entry => String(entry.id) === String(filterId));

    if (saved === undefined) {
      return;
    }

    if (dirty && loadedFilter !== null) {
      const discard = window.confirm(
        `Discard unsaved changes to '${loadedFilter.name}'?`
      );

      if (discard === false) {
        if (savedSelect !== null) {
          savedSelect.value = loadedFilter === null ? '' : String(loadedFilter.id);
          savedSelect.inputValue = loadedFilter?.name ?? 'None';
        }
        return;
      }
    }

    applyStoredFilter(saved);
  };

  const openSave = () => {
    saveOpen = true;
    saveName = loadedFilter?.name ?? '';
    saveError = null;
    replaceId = null;
    renameOpen = false;
  };

  const afterSave = saved => {
    const without = savedFilters.filter(entry => entry.id !== saved.id);

    savedFilters = [saved, ...without];
    loadedFilter = saved;
    baseline = filters;
    dirty = false;
    saveOpen = false;
    saveName = '';
    saveError = null;
    replaceId = null;
    savedError = null;
    rememberSavedFilter(saved.name);
  };

  const findExistingId = async name => {
    try {
      savedFilters = await api.insights.picker.filters.list();
      const existing = savedFilters.find(entry =>
        entry.name.toLowerCase() === name.toLowerCase()
      );

      return existing?.id ?? null;
    }
    catch {
      return null;
    }
  };

  const saveAs = async () => {
    const name = saveName.trim();

    if (name === '' || saving) {
      return;
    }

    saving = true;
    saveError = null;

    try {
      const saved = await api.insights.picker.filters.create(name, payload());
      afterSave(saved);
    }
    catch (failure) {
      saveError = failure.message ?? 'unable to save the filter';

      if (saveError.includes('already exists')) {
        replaceId = await findExistingId(name);
      }
    }
    finally {
      saving = false;
    }
  };

  const replaceSaved = async () => {
    if (replaceId === null || saving) {
      return;
    }

    saving = true;
    saveError = null;

    try {
      const saved = await api.insights.picker.filters.update(replaceId, {
        name: saveName.trim(),
        filter: payload()
      });
      afterSave(saved);
    }
    catch (failure) {
      saveError = failure.message ?? 'unable to replace the filter';
    }
    finally {
      saving = false;
    }
  };

  const saveLoaded = async () => {
    if (loadedFilter === null || saving) {
      return;
    }

    saving = true;
    saveError = null;

    try {
      const saved = await api.insights.picker.filters.update(loadedFilter.id, {
        filter: payload()
      });
      afterSave(saved);
    }
    catch (failure) {
      saveError = failure.message ?? 'unable to save the filter';
    }
    finally {
      saving = false;
    }
  };

  const openRename = () => {
    if (loadedFilter === null) {
      return;
    }

    renameOpen = true;
    renameName = loadedFilter.name;
    renameError = null;
    saveOpen = false;
  };

  const renameSaved = async () => {
    const name = renameName.trim();

    if (loadedFilter === null || name === '' || saving) {
      return;
    }

    saving = true;
    renameError = null;

    try {
      const saved = await api.insights.picker.filters.update(loadedFilter.id, { name });
      savedFilters = savedFilters.map(entry => entry.id === saved.id ? saved : entry);
      loadedFilter = saved;
      renameOpen = false;
      renameError = null;
      rememberSavedFilter(saved.name);
    }
    catch (failure) {
      renameError = failure.message ?? 'unable to rename the filter';
    }
    finally {
      saving = false;
    }
  };

  const deleteSaved = async () => {
    if (loadedFilter === null || saving) {
      return;
    }

    if (window.confirm(`Delete the saved filter '${loadedFilter.name}'?`) === false) {
      return;
    }

    saving = true;
    savedError = null;

    try {
      await api.insights.picker.filters.remove(loadedFilter.id);
      savedFilters = savedFilters.filter(entry => entry.id !== loadedFilter.id);
      loadedFilter = null;
      dirty = false;
      baseline = filters;
      renameOpen = false;
      saveOpen = false;
      rememberSavedFilter(null);
    }
    catch (failure) {
      savedError = failure.message ?? 'unable to delete the filter';
    }
    finally {
      saving = false;
    }
  };

  // ---------------------------------------------------------------------------
  // Restored state
  // ---------------------------------------------------------------------------

  const userId = () => String($user?.id ?? 'anonymous');
  const draftKey = () => `luddatumbazo:insights:picker:draft:${userId()}`;
  const lastSavedKey = () => `luddatumbazo:insights:picker:last-filter:${userId()}`;

  const storageRead = (storage, key) => {
    try {
      return storage.getItem(key);
    }
    catch {
      return null;
    }
  };

  const rememberSavedFilter = name => {
    try {
      if (name === undefined || name === null || name === '') {
        localStorage.removeItem(lastSavedKey());
      }
      else {
        localStorage.setItem(lastSavedKey(), String(name));
      }
    }
    catch {
      // Storage being unavailable only means the choice is not remembered.
    }
  };

  const readLastSavedFilter = () => storageRead(localStorage, lastSavedKey()) ?? '';

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(draftKey());
    }
    catch {
      // Nothing to clean up when storage is unavailable.
    }
  };

  // Restore the in-progress picker (including a result) after visiting a game.
  // The stored shape is validated field by field so an older or damaged draft
  // falls back to the normal controls instead of breaking the page.
  const restoreDraft = () => {
    const raw = storageRead(sessionStorage, draftKey());

    if (raw === null) {
      return false;
    }

    try {
      const draft = JSON.parse(raw);
      const saved = draft?.filters;

      if (saved === null || saved === undefined || typeof saved !== 'object') {
        return false;
      }

      const blank = blankFilters();
      const history = saved.history ?? {};

      filters = {
        ...blank,
        players: { ...blank.players, ...(saved.players ?? {}) },
        time: { ...blank.time, ...(saved.time ?? {}) },
        complexity: { ...blank.complexity, ...(saved.complexity ?? {}) },
        categories: Array.isArray(saved.categories) ? [...saved.categories] : [],
        mechanics: Array.isArray(saved.mechanics) ? [...saved.mechanics] : [],
        history: {
          ...blank.history,
          ...history,
          players: Array.isArray(history.players) ? [...history.players] : []
        }
      };
      baseline = filters;
      result = draft.result !== null && typeof draft.result === 'object'
        ? draft.result
        : null;
      loadedFilter = draft.loadedFilter ?? null;
      dirty = draft.dirty === true;

      if (result !== null && window.matchMedia('(max-width: 720px)').matches) {
        filtersOpen = false;
      }

      return true;
    }
    catch {
      return false;
    }
  };

  const persistDraft = (nextFilters, nextResult, nextLoaded, nextDirty) => {
    if (hydrated === false) {
      return;
    }

    try {
      const empty = nextResult === null &&
        nextLoaded === null &&
        JSON.stringify(nextFilters) === JSON.stringify(blankFilters());

      if (empty) {
        sessionStorage.removeItem(draftKey());
      }
      else {
        sessionStorage.setItem(draftKey(), JSON.stringify({
          filters: nextFilters,
          result: nextResult,
          loadedFilter: nextLoaded,
          dirty: nextDirty
        }));
      }
    }
    catch {
      // A full or unavailable store only costs the restore, never the page.
    }
  };

  $: persistDraft(filters, result, loadedFilter, dirty);
  $: if (savedSelect !== null) {
    savedSelect.value = loadedFilter === null ? '' : String(loadedFilter.id);
    savedSelect.inputValue = loadedFilter?.name ?? 'None';
  }

  const hydrateSavedFilters = async () => {
    const restored = restoreDraft();
    savedError = null;

    try {
      savedFilters = await api.insights.picker.filters.list();

      if (loadedFilter !== null) {
        const current = savedFilters.find(entry => entry.id === loadedFilter.id);

        if (current === undefined) {
          loadedFilter = null;
          dirty = false;
          baseline = filters;
          rememberSavedFilter(null);
        }
        else {
          loadedFilter = current;
        }
      }

      // A draft belongs to this tab and outranks the last applied saved filter:
      // it may contain deliberate unsaved edits. Only a fresh visit falls back
      // to the remembered name.
      if (restored === false) {
        const name = readLastSavedFilter();
        const saved = name === ''
          ? undefined
          : savedFilters.find(entry => entry.name === name);

        if (saved !== undefined) {
          applyStoredFilter(saved);
          await tick();
          find();
        }
        else if (name !== '') {
          rememberSavedFilter(null);
        }
      }
    }
    catch (failure) {
      savedError = failure.message ?? 'unable to load saved filters';
    }
    finally {
      hydrated = true;
    }
  };

  // ---------------------------------------------------------------------------
  // Presentation helpers
  // ---------------------------------------------------------------------------

  const gamePlayers = game => game.minPlayers === game.maxPlayers
    ? `${game.minPlayers} player${game.minPlayers === 1 ? '' : 's'}`
    : `${game.minPlayers}–${game.maxPlayers} players`;

  const gameTime = game => {
    if (game.minPlaytime === game.maxPlaytime) {
      return `${game.minPlaytime} min`;
    }

    return `${game.minPlaytime}–${game.maxPlaytime} min`;
  };

  const weight = game => Number(game.complexity ?? 0).toFixed(2);

  $: picked = result?.picked ?? null;
  $: otherMatches = result === null
    ? []
    : result.matches.filter(game => game.id !== picked?.id);
  $: visibleMatches = showAllMatches ? otherMatches : otherMatches.slice(0, 5);

  const day = value => DateTime.fromISO(value).toLocaleString({
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  loadPeople();
  loadMetadata();
  hydrateSavedFilters();
</script>


<PageHead title="Game Picker"
          description="Filter the household's shelf, then let the server draw one game at random."
          hideDescriptionOnNarrow stackActionsOnNarrow />

<div class="picker-layout">
  <aside class="rail" class:rail-open={filtersOpen}>
    <button type="button" class="rail-toggle" aria-expanded={filtersOpen}
            on:click={() => filtersOpen = !filtersOpen}>
      <span>Filters</span>
      <span class="rail-summary">{activeSummary}</span>
      <span class="rail-chevron" aria-hidden="true"></span>
    </button>

    <div class="rail-body">
      <div class="saved-block">
        <div class="saved-head">
          <span class="group-label">Saved filters</span>
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <wa-button size="xs" appearance="plain" on:click={openSave}>Save as</wa-button>
        </div>

        {#if savedError !== null}
          <span class="field-error">{savedError}</span>
        {/if}

        {#if savedFilters.length > 0}
          <div class="saved-picker">
            <wa-combobox bind:this={savedSelect} label="Load saved filter"
                         value={loadedFilter === null ? '' : String(loadedFilter.id)}
                         placeholder="None" with-clear max-options-visible="6"
                         on:change={event => selectSavedFilter(event.target.value)}>
              <wa-option value="">None</wa-option>
              {#each savedFilters as saved (saved.id)}
                <wa-option value={String(saved.id)}>{saved.name}</wa-option>
              {/each}
            </wa-combobox>

            <div class="saved-icons">
              <IconButton caption="" icon="pencil-fill"
                          label="Rename saved filter" title="Rename saved filter"
                          variant="neutral" appearance="plain"
                          disabled={loadedFilter === null || saving}
                          onclick={openRename} />
              <IconButton caption="" icon="trash3"
                          label="Delete saved filter" title="Delete saved filter"
                          variant="neutral" appearance="plain"
                          disabled={loadedFilter === null || saving}
                          onclick={deleteSaved} />
            </div>
          </div>
        {/if}

        {#if loadedFilter !== null && dirty}
          <div class="loaded-filter">
            <span class="loaded-name">Unsaved changes</span>
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <wa-button size="xs" appearance="outlined" variant="brand"
                       disabled={saving} on:click={saveLoaded}>Save changes</wa-button>
          </div>
        {/if}

        {#if saveOpen}
          <div class="save-form">
            <wa-input label="Filter name" maxlength="60" value={saveName}
                      placeholder="Friday night"
                      on:change={event => saveName = event.target.value}></wa-input>

            {#if saveError !== null}
              <span class="field-error">{saveError}</span>
            {/if}

            <div class="saved-actions">
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <wa-button size="xs" appearance="plain"
                         on:click={() => { saveOpen = false; saveError = null; replaceId = null; }}>
                Cancel
              </wa-button>
              {#if replaceId !== null}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <wa-button size="xs" variant="warning" appearance="filled"
                           disabled={saving} on:click={replaceSaved}>Replace</wa-button>
              {:else}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <wa-button size="xs" variant="brand" appearance="filled"
                           disabled={saving || saveName.trim() === ''}
                           on:click={saveAs}>Save</wa-button>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      {#if peopleError !== null}
        <div class="rail-warning">
          <span>{peopleError}</span>
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <wa-button size="xs" appearance="plain" on:click={loadPeople}>Retry</wa-button>
        </div>
      {/if}

      {#if metadataError !== null}
        <div class="rail-warning">
          <span>{metadataError}</span>
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <wa-button size="xs" appearance="plain" on:click={loadMetadata}>Retry</wa-button>
        </div>
      {/if}

      <div class="filter-group">
        <span class="group-label">Players</span>
        <div class="range-row">
          <wa-input type="number" label="Min" min="1" max="99" placeholder="Any"
                    value={filters.players.min}
                    on:change={event => filters = { ...filters, players: { ...filters.players, min: event.target.value } }}></wa-input>
          <wa-input type="number" label="Max" min="1" max="99" placeholder="Any"
                    value={filters.players.max}
                    on:change={event => filters = { ...filters, players: { ...filters.players, max: event.target.value } }}></wa-input>
        </div>
        {#if playersInvalid}
          <span class="field-error">Min cannot be greater than max.</span>
        {/if}
      </div>

      <div class="filter-group">
        <span class="group-label">Time</span>
        <div class="range-row">
          <wa-input type="number" label="Min" min="1" max="9999" placeholder="Any"
                    value={filters.time.min}
                    on:change={event => filters = { ...filters, time: { ...filters.time, min: event.target.value } }}></wa-input>
          <wa-input type="number" label="Max" min="1" max="9999" placeholder="Any"
                    value={filters.time.max}
                    on:change={event => filters = { ...filters, time: { ...filters.time, max: event.target.value } }}></wa-input>
        </div>
        {#if timeInvalid}
          <span class="field-error">Min cannot be greater than max.</span>
        {/if}
      </div>

      <div class="filter-group">
        <span class="group-label">Weight</span>
        <div class="range-row">
          <wa-input type="number" label="Min" min="0" max="10" step="0.1" placeholder="Any"
                    value={filters.complexity.min}
                    on:change={event => filters = { ...filters, complexity: { ...filters.complexity, min: event.target.value } }}></wa-input>
          <wa-input type="number" label="Max" min="0" max="10" step="0.1" placeholder="Any"
                    value={filters.complexity.max}
                    on:change={event => filters = { ...filters, complexity: { ...filters.complexity, max: event.target.value } }}></wa-input>
        </div>
        {#if complexityInvalid}
          <span class="field-error">Min cannot be greater than max.</span>
        {/if}
      </div>

      <div class="filter-group">
        <wa-combobox bind:this={categoryBox} multiple label="Categories"
                     value={categoryValues} placeholder="Any category" with-clear
                     max-options-visible="1"
                     on:change={event => setIds('categories', event.target.value)}>
          {#each categories as category (category.id)}
            <wa-option value={String(category.id)}>{category.name}</wa-option>
          {/each}
          <span slot="empty">No categories loaded.</span>
          <span slot="no-results">No categories match.</span>
        </wa-combobox>
      </div>

      <div class="filter-group">
        <wa-combobox bind:this={mechanicBox} multiple label="Mechanics"
                     value={mechanicValues} placeholder="Any mechanic" with-clear
                     max-options-visible="1"
                     on:change={event => setIds('mechanics', event.target.value)}>
          {#each mechanics as mechanic (mechanic.id)}
            <wa-option value={String(mechanic.id)}>{mechanic.name}</wa-option>
          {/each}
          <span slot="empty">No mechanics loaded.</span>
          <span slot="no-results">No mechanics match.</span>
        </wa-combobox>
      </div>

      <div class="history-block">
        <wa-switch checked={filters.history.enabled}
                   on:change={event => setHistoryEnabled(event.target.checked)}>
          Use play history
        </wa-switch>

        {#if filters.history.enabled}
          <wa-combobox bind:this={historyBox} multiple label="People"
                       value={selectedHistory} placeholder="Choose people" with-clear
                       max-options-visible="1"
                       on:change={event => setHistoryPeople(event.target.value)}>
            {#each peopleOptions() as person (person.key)}
              <wa-option value={person.key}>{person.name}</wa-option>
            {/each}
            <span slot="empty">No people loaded.</span>
            <span slot="no-results">No people match.</span>
          </wa-combobox>

          <wa-input type="date" label="Played since"
                    value={filters.history.from}
                    max={DateTime.now().toISODate()}
                    on:change={event => filters = { ...filters, history: { ...filters.history, from: event.target.value } }}></wa-input>

          <wa-select label="Show" value={filters.history.mode}
                     on:change={event => filters = { ...filters, history: { ...filters.history, mode: event.target.value } }}>
            <wa-option value="exclude">New to us</wa-option>
            <wa-option value="include">Played recently</wa-option>
          </wa-select>

          {#if historyInvalid}
            <span class="field-error">Choose at least one person.</span>
          {/if}
        {/if}
      </div>

      <div class="rail-actions">
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button appearance="outlined" variant="neutral" size="s" on:click={reset}>
          Reset
        </wa-button>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button variant="brand" appearance="filled" size="s"
                   disabled={!valid || searching} on:click={() => find()}>
          Find a game
        </wa-button>
      </div>
    </div>
  </aside>

  <section class="results" aria-live="polite">
    {#if searching}
      <LoadingState label="Drawing a game" />
    {:else if error !== null}
      <ErrorState {error} retry={() => find()} />
    {:else if result === null}
      <EmptyState title="Set the table"
                  description="Choose any filters you like — or none for a surprise — then draw a game from the household shelf.">
        <svelte:fragment slot="action">
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <wa-button variant="brand" appearance="filled"
                     disabled={!valid} on:click={() => find()}>
            Find a game
          </wa-button>
        </svelte:fragment>
      </EmptyState>
    {:else if result.total === 0}
      <div class="results-block">
        <div class="match-summary">
          <span class="match-count">No games match</span>
          <span class="muted">Owned base games only; pure expansions are never offered.</span>
        </div>

        {#if activeChips.length > 0}
          <ul class="chips" aria-label="Active filters">
            {#each activeChips as chip}
              <li>{chip}</li>
            {/each}
          </ul>
        {/if}

        <EmptyState title="Nothing fits all of those filters"
                    description="Loosen the player count or time window, remove a category or mechanic, or switch off play history." />
      </div>
    {:else}
      <div class="results-block">
        <div class="match-summary">
          <span class="match-count">
            {result.total} game{result.total === 1 ? '' : 's'} match
          </span>
          <span class="muted">Owned base games only</span>
        </div>

        {#if activeChips.length > 0}
          <ul class="chips" aria-label="Active filters">
            {#each activeChips as chip}
              <li>{chip}</li>
            {/each}
          </ul>
        {/if}

        {#if picked !== null}
          <article class="pick-card">
            {#if picked.imagePath}
              <div class="pick-art">
                <wa-lightbox label={`${picked.name} box art`}
                             without-counter without-navigation>
                  <wa-lightbox-item src={picked.imageFullPath}
                                    alt={`${picked.name} box art`}>
                    <GameImage imagePath={picked.imagePath} name={picked.name} />
                  </wa-lightbox-item>
                </wa-lightbox>
              </div>
            {/if}

            <div class="pick-copy">
              <span class="eyebrow">Tonight&rsquo;s pick</span>
              <h2>{picked.name}</h2>
              <p class="pick-meta">
                {gamePlayers(picked)} · {gameTime(picked)} · weight {weight(picked)}
              </p>

              <div class="card-chips">
                <span>{gamePlayers(picked)}</span>
                <span>{gameTime(picked)}</span>
                <span>Weight {weight(picked)}</span>
                {#if filters.history.enabled}
                  <span>{filters.history.mode === 'include' ? 'Played recently' : 'New to us'}</span>
                {/if}
              </div>

              {#if result.onlyMatch}
                <p class="only-match">
                  This is the only game that matches, so it came up again.
                </p>
              {/if}

              <div class="pick-actions">
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <wa-button size="s" variant="brand" appearance="filled"
                           disabled={searching} on:click={pickAnother}>
                  Pick another
                </wa-button>
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <wa-button size="s" variant="neutral" appearance="outlined"
                           href={`#/game/${picked.slug}`}>
                  View game
                </wa-button>
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <wa-button size="s" variant="neutral" appearance="outlined"
                           href="#/sessions?add=1">
                  Log session
                </wa-button>
              </div>
            </div>
          </article>
        {/if}

        <Panel title="Also in the running"
               note={`${otherMatches.length} other match${otherMatches.length === 1 ? '' : 'es'}`}
               flush>
          {#if otherMatches.length === 0}
            <p class="table-note">No other games match these filters.</p>
          {:else}
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Game</th>
                    <th class="num">Players</th>
                    <th class="num">Time</th>
                    <th class="num">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {#each visibleMatches as game (game.id)}
                    <tr>
                      <td data-label="Game"><a class="game-link" href={`#/game/${game.slug}`}>{game.name}</a></td>
                      <td class="num" data-label="Players">{game.minPlayers}–{game.maxPlayers}</td>
                      <td class="num" data-label="Time">{gameTime(game)}</td>
                      <td class="num" data-label="Weight">{weight(game)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

            {#if otherMatches.length > 5}
              <div class="table-more">
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <wa-button size="s" appearance="plain"
                           on:click={() => showAllMatches = !showAllMatches}>
                  {showAllMatches ? 'Show fewer' : `Show all ${otherMatches.length}`}
                </wa-button>
              </div>
            {/if}
          {/if}
        </Panel>

        {#if filters.history.enabled && filters.history.from !== ''}
          <p class="footnote">
            History period: since {day(filters.history.from)}.
          </p>
        {/if}
      </div>
    {/if}
  </section>
</div>


{#if renameOpen && loadedFilter !== null}
  <wa-dialog open label="Rename saved filter" style="max-width: 420px"
             on:wa-hide={() => { renameOpen = false; renameError = null; }}>
    <h3 slot="header">Rename saved filter</h3>

    <!-- wa-input wraps a real input; the custom element's keydown is the one
         Svelte cannot see into. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <wa-input label="New name" maxlength="60" value={renameName}
              on:input={event => renameName = event.target.value}
              on:keydown={event => { if (event.key === 'Enter') { event.preventDefault(); renameSaved(); } }}></wa-input>

    {#if renameError !== null}
      <span class="field-error">{renameError}</span>
    {/if}

    <div slot="footer" class="dialog-actions">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="outlined" variant="neutral"
                 on:click={() => { renameOpen = false; renameError = null; }}>
        Cancel
      </wa-button>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button variant="brand" appearance="filled"
                 disabled={saving || renameName.trim() === ''}
                 loading={saving} on:click={renameSaved}>Rename</wa-button>
    </div>
  </wa-dialog>
{/if}


<style>
  .picker-layout {
    display: grid;
    grid-template-columns: 350px minmax(0, 1fr);
    align-items: start;
    gap: var(--app-summary-gap);
  }

  .rail {
    min-width: 0;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-lowered);
    overflow: hidden;
  }

  .rail-toggle {
    display: none;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 44px;
    padding: 10px 16px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: var(--wa-font-weight-semibold);
    text-align: left;
    cursor: pointer;
  }

  .rail-toggle:focus-visible {
    outline: 2px solid var(--wa-color-brand-border-loud);
    outline-offset: -2px;
  }

  .rail-summary {
    margin-left: auto;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    font-weight: var(--wa-font-weight-normal);
  }

  .rail-chevron {
    flex: 0 0 auto;
    width: 7px;
    height: 7px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(45deg);
    transition: transform var(--wa-transition-normal);
  }

  .rail-open .rail-chevron {
    transform: rotate(-135deg);
  }

  .rail-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: var(--app-panel-body-padding);
  }

  .saved-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--wa-color-surface-border);
  }

  .saved-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .saved-picker {
    display: flex;
    align-items: flex-end;
    gap: 4px;
  }

  .saved-picker wa-combobox {
    flex: 1 1 auto;
    min-width: 0;
  }

  .saved-icons {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-bottom: 2px;
  }

  .loaded-filter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--wa-border-radius-s);
    background: var(--wa-color-surface-raised);
  }

  .loaded-name {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  .saved-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    flex-wrap: wrap;
  }

  .save-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-s);
    background: var(--wa-color-surface-default);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .group-label {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-2xs, 0.75rem);
    font-weight: var(--wa-font-weight-semibold);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .range-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .history-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--wa-color-surface-border);
  }

  .field-error {
    color: var(--wa-color-danger-on-quiet);
    font-size: var(--wa-font-size-s);
  }

  .rail-warning {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 8px;
    border: 1px solid var(--wa-color-warning-border-loud);
    border-radius: var(--wa-border-radius-s);
    color: var(--wa-color-warning-on-quiet);
    font-size: var(--wa-font-size-s);
  }

  .rail-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
    padding-top: 4px;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;
  }

  .results {
    min-width: 0;
  }

  .results-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .match-summary {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .match-count {
    font-size: var(--wa-font-size-l);
    font-weight: var(--wa-font-weight-semibold);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .chips li {
    padding: 3px 10px;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: 999px;
    background: var(--wa-color-surface-lowered);
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  .pick-card {
    display: flex;
    align-items: stretch;
    gap: 20px;
    padding: var(--app-panel-body-padding);
    border: 1px solid var(--wa-color-brand-border-loud);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-default);
  }

  .pick-art {
    flex: 0 0 150px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
  }

  .pick-art :global(wa-lightbox) {
    display: contents;
  }

  .pick-art :global(img) {
    max-height: 150px;
    width: auto;
  }

  .pick-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;
  }

  .eyebrow {
    color: var(--wa-color-text-link);
    font-size: var(--wa-font-size-2xs, 0.75rem);
    font-weight: var(--wa-font-weight-semibold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .pick-copy h2 {
    margin: 0;
    font-size: var(--wa-font-size-2xl, 2rem);
    line-height: 1.15;
    overflow-wrap: anywhere;
  }

  .pick-meta {
    margin: 0;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  .card-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 2px 0;
  }

  .card-chips span {
    padding: 2px 9px;
    border-radius: 999px;
    background: var(--wa-color-surface-raised);
    font-size: var(--wa-font-size-s);
  }

  .only-match {
    margin: 0;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    font-style: italic;
  }

  .pick-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
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

  .game-link {
    font-weight: var(--wa-font-weight-semibold);
  }

  .table-more {
    display: flex;
    justify-content: center;
    padding: 6px 16px;
    border-top: 1px solid var(--wa-color-surface-border);
  }

  .table-note {
    margin: 0;
    padding: 12px 16px;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  .footnote {
    margin: 0;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  @media (max-width: 1023px) {
    .picker-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .rail-body {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: end;
    }

    .saved-block,
    .history-block {
      grid-column: 1 / -1;
    }

    .rail-actions {
      grid-column: 1 / -1;
    }

    .rail-warning {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 720px) {
    .rail-toggle {
      display: flex;
    }

    .rail:not(.rail-open) .rail-body {
      display: none;
    }

    .rail-body {
      display: flex;
      align-items: stretch;
      padding-top: 4px;
    }

    .pick-card {
      gap: 14px;
      padding: 16px;
    }

    .pick-art {
      flex-basis: 96px;
    }

    .pick-art :global(img) {
      max-height: 96px;
    }

    .pick-copy h2 {
      font-size: var(--wa-font-size-xl, 1.5rem);
    }
  }

  @media (max-width: 440px) {
    .pick-art {
      display: none;
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
    }

    .data-table td:first-child::before {
      display: none;
    }

    .data-table td:first-child {
      margin-bottom: 4px;
      text-align: left;
    }
  }
</style>
