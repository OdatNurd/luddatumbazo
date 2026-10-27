<script>
  import { api } from '$api';

  import Confirm from '$components/Confirm.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Whether the dialog is currently presented.
  export let open = false;

  // The game record to edit, or null to create a new game. The presence of a
  // record is what puts the dialog into edit mode.
  export let game = null;

  // ---------------------------------------------------------------------------

  // Invoked when the dialog closes; the detail is always { result: null } for
  // now, since saving is not implemented yet and both commit buttons are
  // disabled. The callback exists so that the caller can dismiss us.
  export let onclose = undefined;

  // The five metadata list types; each gets a multi-select on the Details tab.
  const metaTypes = ['designer', 'artist', 'publisher', 'category', 'mechanic'];

  // The mode the dialog is operating in, derived from whether we were handed a
  // record to edit.
  $: editing = (game !== null && game !== undefined);

  // ---------------------------------------------------------------------------

  // A pristine form; the shape mirrors NewGameSchema (minus slug, which the
  // back end derives) so that the eventual save is a straight object build.
  //
  // Metadata items travel as { name, bggId }; slug creation is the API's job
  // (the schema transform and the metadata update normalize them), so the
  // dialog never builds slugs behind the scenes.
  const blankForm = () => ({
    bggId: 0,
    bggIdText: '',
    primaryName: '',
    altNames: [],
    description: '',
    published: null,
    minPlayers: 1,
    maxPlayers: 1,
    minPlayerAge: 1,
    playTime: 1,
    minPlayTime: 1,
    maxPlayTime: 1,
    complexity: 1.0,
    officialUrl: '',
    teachingUrl: '',
    image: '',
    thumbnail: '',
    designer: [],
    artist: [],
    publisher: [],
    category: [],
    mechanic: []
  });

  let form = blankForm();

  // The known metadata items of each type in our database, fetched when the
  // dialog opens; used to flag which of the record's items would be created
  // new. These are read only queries -- nothing here ever writes.
  let metaKnown = {};
  let metaLoading = false;

  // The transient warning banner text (bad BGG id, failed lookup), or null.
  let warning = null;

  // True while a BGG lookup is in flight.
  let searching = false;

  // The reference to the confirm dialog used before a lookup would replace data
  // that is already in the form.
  let confirmModal = null;

  // The full size image shown by the box art lightbox, or null when closed.
  let lightbox = null;

  // ---------------------------------------------------------------------------

  // Map a metadata item from either data source down to the { name, bggId }
  // pair that the record (and the eventual save) works in.
  const metaItem = item => ({ name: item.name, bggId: item.bggId ?? 0 });

  // Normalize the BGG lookup payload (names array, item lists keyed by their
  // BGG field names) into the form.
  const fromBGG = data => {
    const next = blankForm();

    next.bggId = data.bggId ?? 0;
    next.bggIdText = String(next.bggId);
    next.primaryName = (data.name ?? [])[0] ?? '';
    next.altNames = (data.name ?? []).slice(1);
    next.description = data.description ?? '';
    next.published = data.published ?? null;
    next.minPlayers = data.minPlayers ?? 1;
    next.maxPlayers = data.maxPlayers ?? 1;
    next.minPlayerAge = data.minPlayerAge ?? 1;
    next.playTime = data.playTime ?? 1;
    next.minPlayTime = data.minPlayTime ?? 1;
    next.maxPlayTime = data.maxPlayTime ?? 1;
    next.complexity = data.complexity ?? 1.0;
    next.officialUrl = data.officialUrl ?? '';
    next.teachingUrl = data.teachingUrl ?? '';
    next.image = data.image ?? '';
    next.thumbnail = data.thumbnail ?? data.image ?? '';

    metaTypes.forEach(type => next[type] = (data[type] ?? []).map(metaItem));

    return next;
  };

  // Normalize an existing game record (DB column names, names as records)
  // into the same form.
  const fromGame = record => {
    const next = blankForm();

    next.bggId = record.bggId ?? 0;
    next.bggIdText = String(next.bggId);
    next.primaryName = (record.names ?? [])[0]?.name ?? record.primaryName ?? '';
    next.altNames = (record.names ?? []).slice(1).map(entry => entry.name);
    next.description = record.description ?? '';
    next.published = record.publishedIn ?? null;
    next.minPlayers = record.minPlayers ?? 1;
    next.maxPlayers = record.maxPlayers ?? 1;
    next.minPlayerAge = record.minPlayerAge ?? 1;
    next.playTime = record.playtime ?? 1;
    next.minPlayTime = record.minPlaytime ?? 1;
    next.maxPlayTime = record.maxPlaytime ?? 1;
    next.complexity = record.complexity ?? 1.0;
    next.officialUrl = record.officialURL ?? '';
    next.teachingUrl = record.teachingURL ?? '';
    next.image = record.imagePath ?? '';
    next.thumbnail = record.imagePath ?? '';

    metaTypes.forEach(type => next[type] = (record[type] ?? []).map(metaItem));

    return next;
  };

  // ---------------------------------------------------------------------------

  // Whether the form holds any content that a BGG lookup would wipe out; the
  // bggId row and the art do not count, since those are the lookup's own
  // output. Anything else that differs from a pristine form counts.
  const isDirty = () => {
    const blank = blankForm();

    return Object.keys(blank).some(key => {
      if (key === 'bggId' || key === 'bggIdText' || key === 'image' || key === 'thumbnail') {
        return false;
      }

      const value = form[key];
      return Array.isArray(value) ? value.length > 0 : value !== blank[key];
    });
  };

  // Pull the game data from BGG and pour it into the form. This replaces the
  // dialog's content; callers warn first via runLookup().
  const lookup = async (bggId) => {
    searching = true;
    warning = null;

    try {
      form = fromBGG(await api.bgg.lookup(bggId));
    }
    catch (error) {
      warning = error.message ?? 'the lookup failed';
    }
    finally {
      searching = false;
    }
  };

  // The Search button: validate the id, warn before whacking existing content,
  // then pull the game down.
  const runLookup = async () => {
    const text = form.bggIdText.trim();

    // Anything other than a plain numeric id (a pasted URL, a game name) is
    // refused right here; the field is the source of truth for the record and
    // a search with anything else is not going to work.
    if (/^\d+$/.test(text) === false) {
      warning = 'Enter just the numeric BGG id (e.g. 1472); a URL or game name will not work here.';
      return;
    }

    // Searching replaces everything in the dialog; make sure that is wanted
    // when there is anything to lose.
    if (isDirty() === true) {
      const proceed = await confirmModal.show({
        title: 'Replace dialog contents?',
        message: 'Searching BoardGameGeek will replace all of the data currently in the dialog. Continue?'
      });

      if (proceed === false) {
        return;
      }
    }

    await lookup(text);
  };

  // ---------------------------------------------------------------------------

  // Whether two metadata items denote the same thing: the same BGG id when
  // both sides have one, or the same name otherwise.
  const sameItem = (left, right) =>
    (left.bggId !== 0 && right.bggId !== 0 && left.bggId === right.bggId) ||
    (left.name.toLowerCase() === right.name.toLowerCase());

  // The display label for each metadata type's controls.
  const metaLabels = {
    designer: 'Designers',
    artist: 'Artists',
    publisher: 'Publishers',
    category: 'Categories',
    mechanic: 'Mechanics'
  };

  // Everything the credits tab needs for one type: the select's label, the
  // options it offers with their "New" flags, and the currently selected values
  // (item names). The options are the record's own items first (so the record
  // is conveyed in full), then the database items it does not already cover.
  //
  //  A metadata item is "New" when no record of that type in our database
  // matches it; until the lists are loaded nothing can be judged, so no flags
  // are shown.
  //
  // This is a plain function of the state it reads, named as direct arguments
  // in the reactive statement below: template expressions only track the
  // identifiers they name, not what a called function reads, so the
  // dependencies have to stay visible.
  const buildMetaRows = (form, metaKnown) =>
    metaTypes.map(type => {
      const known = metaKnown[type];
      const record = form[type];
      const options = [...record];

      for (const entry of (known ?? [])) {
        if (options.some(item => sameItem(entry, item)) === false) {
          options.push({ name: entry.name, bggId: entry.bggId });
        }
      }

      return {
        type,
        label: metaLabels[type],

        options: options.map(item => ({
          ...item,
          isNew: known !== undefined && known.every(entry => sameItem(entry, item) === false)
        })),

        selected: record.map(item => item.name)
      };
    });

  $: metaRows = buildMetaRows(form, metaKnown);

  // Rebuild a type's record items from a select's chosen values; items resolve
  // against the option list so known items keep their BGG ids.
  const syncType = (type, values) => {
    const row = metaRows.find(entry => entry.type === type);
    const options = row?.options ?? [];

    form[type] = values.map(value => options.find(option => option.name === value))
                        .filter(item => item !== undefined)
                        .map(metaItem);
    form = form;
  };

  // Each select renders its own tags so that a "New" flag can ride along with
  // the selected items; the option label stays plain text so the combobox
  // input is not polluted. Tag removal is delegated by the select itself: its
  // tag container handles `wa-remove` for any wa-tag carrying `data-value`,
  // which updates the select and fires the change we sync from.
  const tagger = (element, type) => {
    element.getTag = (option) => {
      const tag = document.createElement('wa-tag');
      tag.setAttribute('size', element.size ?? 'm');
      tag.setAttribute('with-remove', '');
      tag.setAttribute('data-value', option.value);
      tag.textContent = option.label;

      const item = metaRows.find(entry => entry.type === type)
                           ?.options.find(entry => entry.name === option.value);
      if (item?.isNew === true) {
        const badge = document.createElement('wa-badge');
        badge.setAttribute('variant', 'warning');
        badge.textContent = 'New';
        tag.appendChild(badge);
      }

      return tag;
    };
  };

  // ---------------------------------------------------------------------------

  // Gather the known metadata lists that the "New" flags are computed
  // against, then populate the form for the mode we are opening in; the
  // lists arrive before the form is filled, so that the selects can judge
  // their "New" flags the first time they render their tags.
  const populate = async () => {
    warning = null;
    lightbox = null;

    metaLoading = true;
    try {
      const lists = await Promise.all(metaTypes.map(type => api.metadata.list(type)));
      metaKnown = Object.fromEntries(metaTypes.map((type, index) => [type, lists[index]]));
    }
    catch (error) {
      warning = error.message ?? 'unable to load the metadata lists';
    }
    finally {
      metaLoading = false;
    }

    form = (editing === true) ? fromGame(game) : blankForm();
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

  // Close the dialog, reporting that nothing was applied.
  const abort = () => {
    lightbox = null;
    onclose?.({ result: null });
  };

  // Close only when the dialog itself hides (escape, overlay click); the
  // selects inside of us emit hide events of their own when their dropdowns
  // close, and those bubble up here without meaning the dialog is going away.
  const dismissed = event => {
    if (event.target === event.currentTarget) {
      abort();
    }
  };

  // Keep a form control's value up to date regardless of which change style
  // the underlying component fires, coercing numbers where the schema wants
  // them and leaving null for an emptied numeric field.
  const pick = (target, set, numeric = false) => {
    const raw = target.value;

    if (numeric === false) {
      set(raw);
      return;
    }

    set((raw === '' || raw === null) ? null : Number(raw));
    form = form;
  };
</script>


<Confirm bind:this={confirmModal} />

<wa-dialog class="game-dialog" {open} label={editing ? 'Edit Game' : 'Add Game'}
           style="--width: min(900px, 92vw)"
           on:wa-hide={dismissed}>
  <h3 slot="header">{editing ? 'Edit Game' : 'Add Game'}</h3>

  {#if warning !== null}
    <wa-callout variant="warning">{warning}</wa-callout>
  {/if}

  <wa-tab-group>
    <wa-tab slot="nav" panel="info">Game Info</wa-tab>
    <wa-tab slot="nav" panel="play">Play Info</wa-tab>
    <wa-tab slot="nav" panel="details">Credits & Classification</wa-tab>

    <wa-tab-panel name="info">
      <div class="stack">
        <!-- The BGG row: the id to search with (shown for an edited record
             too), and a thumbnail of the box art that opens the full size
             image when clicked. -->
        <div class="bgg-row">
          <wa-input label="BGG ID" type="text"
                    placeholder="BGG ID" style="max-width: 12rem"
                    value={form.bggIdText}
                    on:input={e => pick(e.target, v => form.bggIdText = v)}>
          </wa-input>

          {#if editing === false}
            <!-- wa-button wraps a real <button>; the a11y warnings are false
                 positives. -->
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <wa-button appearance="outlined" variant="brand"
                       loading={searching} disabled={searching}
                       on:click={runLookup}>
              Search
            </wa-button>
          {/if}

          {#if form.thumbnail !== ''}
            <button type="button" class="thumb" title="View full size box art"
                    on:click={() => lightbox = form.image || form.thumbnail}>
              <img src={form.thumbnail} alt="box art" />
            </button>
          {/if}
        </div>

        <wa-input label="Name" value={form.primaryName}
                  on:input={e => pick(e.target, v => form.primaryName = v)}>
        </wa-input>

        <wa-tag-input label="Alternate Names" value={form.altNames}
                      on:wa-input={e => pick(e.target, v => form.altNames = v)}
                      on:change={e => pick(e.target, v => form.altNames = v)}>
        </wa-tag-input>

        <wa-textarea label="Description" rows="4" value={form.description}
                     on:input={e => pick(e.target, v => form.description = v)}>
        </wa-textarea>

        <div class="stats">
          <wa-input label="Published" type="number" value={form.published ?? ''}
                    on:input={e => pick(e.target, v => form.published = v, true)}>
          </wa-input>
          <wa-input label="Complexity" type="number" step="0.01" value={form.complexity}
                    on:input={e => pick(e.target, v => form.complexity = v, true)}>
          </wa-input>
        </div>

        <wa-input label="Official URL" type="url" value={form.officialUrl}
                  on:input={e => pick(e.target, v => form.officialUrl = v)}>
        </wa-input>

        <wa-input label="Teaching Video URL" type="url" value={form.teachingUrl}
                  on:input={e => pick(e.target, v => form.teachingUrl = v)}>
        </wa-input>
      </div>
    </wa-tab-panel>

    <!-- Everything about how the game plays: player counts, ages and the
         three flavors of play time. -->
    <wa-tab-panel name="play">
      <div class="stack">
        <div class="stats">
          <wa-input label="Min Players" type="number" value={form.minPlayers}
                    on:input={e => pick(e.target, v => form.minPlayers = v, true)}>
          </wa-input>
          <wa-input label="Max Players" type="number" value={form.maxPlayers}
                    on:input={e => pick(e.target, v => form.maxPlayers = v, true)}>
          </wa-input>
          <wa-input label="Min Age" type="number" value={form.minPlayerAge}
                    on:input={e => pick(e.target, v => form.minPlayerAge = v, true)}>
          </wa-input>
          <wa-input label="Play Time" type="number" value={form.playTime}
                    on:input={e => pick(e.target, v => form.playTime = v, true)}>
          </wa-input>
          <wa-input label="Min Play Time" type="number" value={form.minPlayTime}
                    on:input={e => pick(e.target, v => form.minPlayTime = v, true)}>
          </wa-input>
          <wa-input label="Max Play Time" type="number" value={form.maxPlayTime}
                    on:input={e => pick(e.target, v => form.maxPlayTime = v, true)}>
          </wa-input>
        </div>
      </div>
    </wa-tab-panel>

    <wa-tab-panel name="details">
      <div class="stack">
        <div class="muted">
          Items marked <wa-badge variant="warning">New</wa-badge> do not exist
          in the database yet and would be created when the record is saved.
        </div>

        {#each metaRows as row (row.type)}
          <wa-select multiple label={row.label}
                     placeholder={row.label}
                     value={row.selected}
                     use:tagger={row.type}
                     on:change={e => syncType(row.type, e.target.value ?? [])}
                     on:wa-input={e => syncType(row.type, e.target.value ?? [])}>
            {#each row.options as option (option.name)}
              <wa-option value={option.name} label={option.name}>
                {option.name}
                {#if option.isNew}
                  <wa-badge slot="end" variant="warning">New</wa-badge>
                {/if}
              </wa-option>
            {/each}
          </wa-select>
        {/each}

        {#if metaLoading}
          <wa-spinner></wa-spinner>
        {/if}
      </div>
    </wa-tab-panel>
  </wa-tab-group>

  <div slot="footer" class="edit-actions">
    <wa-callout variant="warning" class="wip">
      Work in progress -- saving is not implemented yet.
    </wa-callout>

    <div class="row">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="outlined" variant="neutral" on:click={abort}>Cancel</wa-button>
      <wa-button appearance="filled" variant="brand" disabled>
        {editing ? 'Save Changes' : 'Add Game'}
      </wa-button>
    </div>
  </div>
</wa-dialog>

{#if lightbox !== null}
  <wa-dialog open label="Box Art" style="min-width: min(90vw, 900px)"
             on:wa-hide={() => lightbox = null}>
    <img class="lightbox-img" src={lightbox} alt="full size box art" />
  </wa-dialog>
{/if}


<!-- *********************************************************************** -->


<style>
  /* The dialog holds a fixed share of the viewport no matter which tab is
     active: the title, the tab strip and the footer buttons stay put and only
     the tab content scrolls. The class scopes all of this to the main dialog,
     leaving the box art lightbox alone. */
  .game-dialog::part(dialog) {
    height: 75vh;
    max-height: 75vh;
    display: flex;
    flex-direction: column;
  }

  /* The body never scrolls itself; it hands its space to the tab group. */
  .game-dialog::part(body) {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .game-dialog wa-tab-group,
  .game-dialog wa-tab-group::part(base) {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* The one scroll bar: the tab panels' content area. */
  .game-dialog wa-tab-group::part(body) {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  .bgg-row {
    display: flex;
    /* Bottom-aligned so the Search button lines up with the input control
       itself, not with the combined height of label and control. The button
       and the control share a height, so equal bottoms means equal centers. */
    align-items: flex-end;
    gap: 12px;
    flex-wrap: wrap;
  }

  /* The small box art preview; clicking it opens the lightbox. */
  .thumb {
    padding: 0;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-small);
    background: none;
    cursor: pointer;
    line-height: 0;
  }

  .thumb img {
    width: 64px;
    height: 64px;
    object-fit: contain;
    border-radius: var(--wa-border-radius-small);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
    font-size: var(--wa-font-size-s);
  }

  .lightbox-img {
    display: block;
    max-width: 100%;
    max-height: 80vh;
    margin: 0 auto;
    object-fit: contain;
  }
</style>
