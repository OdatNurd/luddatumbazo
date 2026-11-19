<script>
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';

  import { api } from '$api';
  import { user } from '$stores/user';

  import Confirm from '$components/Confirm.svelte';
  import Icon from '$components/Icon.svelte';
  import IconButton from '$components/IconButton.svelte';
  import PageHead from '$components/PageHead.svelte';
  import EmptyState from '$components/EmptyState.svelte';
  import LoadingState from '$components/LoadingState.svelte';
  import ErrorState from '$components/ErrorState.svelte';
  import SummaryGrid from '$components/SummaryGrid.svelte';
  import SummaryCard from '$components/SummaryCard.svelte';
  import Panel from '$components/Panel.svelte';

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let data = { locations: [], unstoredCount: 0, offShelfCount: 0 };
  let loading = true;
  let error = null;
  let actionError = null;

  let editor = { open: false, mode: 'create', id: null, name: '', parentId: null };
  let saving = false;
  let warning = null;
  let editorDialog = null;
  let focusTimer = null;

  let confirmModal = null;

  // Collapsed parents are remembered per household. The tree defaults to fully
  // expanded; only the nodes the user explicitly closes are stored here.
  let collapsed = new SvelteSet();

  // ---------------------------------------------------------------------------

  const load = async () => {
    if (!$user.household) {
      loading = false;
      return;
    }

    loading = true;
    error = null;

    try {
      data = await api.household.storage.list($user.household);
    }
    catch (failure) {
      error = failure.message ?? 'unable to load storage locations';
    }
    finally {
      loading = false;
    }
  };

  const collapseKey = () => `luddatumbazo:storage-collapsed:${$user.household?.slug ?? 'none'}`;

  const saveCollapsed = () => {
    try {
      localStorage.setItem(collapseKey(), JSON.stringify([...collapsed]));
    }
    catch {
      // Storage can be unavailable in private browsing or when the quota is
      // exhausted; the tree simply will not remember its state in that case.
    }
  };

  const loadCollapsed = () => {
    try {
      const stored = localStorage.getItem(collapseKey());
      const values = stored === null ? [] : JSON.parse(stored);
      collapsed = new SvelteSet(
        Array.isArray(values) ? values.filter(value => Number.isInteger(value)) : []
      );
    }
    catch {
      collapsed = new SvelteSet();
    }
  };

  onMount(() => {
    loadCollapsed();
    load();
  });

  // ---------------------------------------------------------------------------
  // Tree visibility
  // ---------------------------------------------------------------------------

  $: locationsById = new Map(data.locations.map(location => [location.id, location]));
  $: nodesWithChildren = new SvelteSet(
    data.locations
      .map(location => location.parentId)
      .filter(parentId => parentId !== null && parentId !== undefined)
  );

  // A location is visible unless any ancestor is collapsed. This hides the
  // whole subtree, not just the direct children of a collapsed node.
  $: visibleLocations = data.locations.filter(location => {
    let parentId = location.parentId;

    while (parentId !== null && parentId !== undefined) {
      if (collapsed.has(parentId)) {
        return false;
      }

      parentId = locationsById.get(parentId)?.parentId ?? null;
    }

    return true;
  });

  const toggleCollapsed = node => {
    const next = new SvelteSet(collapsed);

    if (next.has(node.id)) {
      next.delete(node.id);
    }
    else {
      next.add(node.id);
    }

    collapsed = next;
    saveCollapsed();
  };

  const expand = id => {
    if (collapsed.has(id) === false) {
      return;
    }

    const next = new SvelteSet(collapsed);
    next.delete(id);
    collapsed = next;
    saveCollapsed();
  };

  // ---------------------------------------------------------------------------
  // Editor
  // ---------------------------------------------------------------------------

  // Focus the name field after the dialog has rendered and completed its own
  // initial focus pass. This runs for both adding and renaming.
  const focusName = () => {
    clearTimeout(focusTimer);
    focusTimer = setTimeout(() => editorDialog?.querySelector('wa-input')?.focus(), 100);
  };

  const openCreate = (parentId = null) => {
    if (parentId !== null) {
      expand(parentId);
    }

    editor = { open: true, mode: 'create', id: null, name: '', parentId };
    warning = null;
    actionError = null;
    focusName();
  };

  const openRename = node => {
    editor = { open: true, mode: 'rename', id: node.id, name: node.name, parentId: node.parentId };
    warning = null;
    actionError = null;
    focusName();
  };

  const closeEditor = () => {
    if (saving === true) {
      return;
    }

    editor = { ...editor, open: false };
    warning = null;
  };

  const dismissed = event => {
    if (event.target === event.currentTarget) {
      if (saving === true) {
        event.preventDefault();
        return;
      }

      closeEditor();
    }
  };

  const parseNames = value => value
    .split(',')
    .map(name => name.trim())
    .filter(name => name !== '');

  const save = async () => {
    if (saving === true) {
      return;
    }

    const names = editor.mode === 'create'
      ? parseNames(editor.name)
      : [editor.name.trim()].filter(name => name !== '');

    if (names.length === 0) {
      warning = editor.mode === 'create'
        ? 'Enter at least one name for the storage location.'
        : 'Enter a name for this storage location.';
      return;
    }

    if (editor.mode === 'create') {
      const tooLong = names.find(name => name.length > 80);
      if (tooLong !== undefined) {
        warning = `Storage location names must be 80 characters or fewer (${tooLong}).`;
        return;
      }

      // Catch duplicate siblings before creating anything so a comma-separated
      // batch does not leave behind a partial result.
      const siblings = data.locations
        .filter(location => location.parentId === editor.parentId)
        .map(location => location.name.toLocaleLowerCase());
      const duplicate = names.find((name, index) => {
        const key = name.toLocaleLowerCase();
        return siblings.includes(key) ||
          names.slice(0, index).some(other => other.toLocaleLowerCase() === key);
      });

      if (duplicate !== undefined) {
        warning = `A storage location named '${duplicate}' already exists here.`;
        return;
      }
    }

    saving = true;
    warning = null;
    let created = 0;

    try {
      if (editor.mode === 'create') {
        // Create serially so IDs, and therefore the display order, follow the
        // order the names were typed.
        for (const name of names) {
          await api.household.storage.create($user.household, name, editor.parentId);
          created += 1;
        }
      }
      else {
        await api.household.storage.update($user.household, editor.id, names[0]);
      }

      editor = { ...editor, open: false };
      await load();
    }
    catch (failure) {
      if (created > 0) {
        editor = { ...editor, open: false };
        actionError = `${created} location${created === 1 ? '' : 's'} created before the error: ${failure.message ?? 'unable to save the storage location'}`;
        await load();
      }
      else {
        warning = failure.message ?? 'unable to save the storage location';
      }
    }
    finally {
      saving = false;
    }
  };

  const remove = async node => {
    const confirmed = await confirmModal.show({
      title: 'Delete storage location?',
      message: `Delete "${node.path}"? This only works when the location has no games or sub-locations.`
    });

    if (confirmed === false) {
      return;
    }

    actionError = null;

    try {
      await api.household.storage.remove($user.household, node.id);
      await load();
    }
    catch (failure) {
      actionError = failure.message ?? 'unable to delete the storage location';
    }
  };

  const plural = count => count === 1 ? 'game' : 'games';

  // Enter in the name field takes the dialog's primary action. The dialog has
  // no native form, so without this the Add/Rename button would be the only
  // way to submit.
  const editorKeydown = event => {
    if (event.key !== 'Enter' || event.isComposing === true) {
      return;
    }

    event.preventDefault();
    save();
  };

  // The path of the location currently open in the editor. Creation is always
  // either top level or initiated from a specific node, so the parent is shown
  // as context rather than as a second dropdown.
  const parentPath = id => data.locations.find(location => location.id === id)?.path;
</script>


{#if !$user.household}
  <PageHead title="Storage" />
  <EmptyState title="No household yet"
              description="You need to belong to a household before you can manage storage." />
{:else}
  <PageHead title="Storage"
            description={`Storage for ${$user.household.name}. Organize shelves and locations; games without one are listed as Unstored.`}
            hideDescriptionOnNarrow>
    <svelte:fragment slot="actions">
      <IconButton variant="brand" appearance="filled" title="Add a storage location"
                  caption="" label="Add storage location" icon="plus"
                  onclick={() => openCreate(null)} />
    </svelte:fragment>
  </PageHead>

  {#if actionError !== null}
    <wa-callout variant="warning">{actionError}</wa-callout>
  {/if}

  {#if error !== null}
    <ErrorState error={error} retry={load} />
  {:else if loading}
    <LoadingState />
  {:else}
    <SummaryGrid>
      <SummaryCard label="Unstored" value={data.unstoredCount}
                   note={plural(data.unstoredCount)} href="#/storage/unstored"
                   title="View the games that do not have a location" />
      <SummaryCard label="Off shelf" value={data.offShelfCount}
                   note={plural(data.offShelfCount)} href="#/storage/off-shelf"
                   title="View the games that are off shelf" />
      <SummaryCard label="Locations" value={data.locations.length} note="defined" />
    </SummaryGrid>

    <Panel title="Locations" note="Select a game from the collection to assign it."
           flush hideNoteOnNarrow>

      <a class="unstored-row" href="#/storage/unstored"
         title="View and assign the unstored games">
        <div class="node-label">
          <span class="node-toggle-placeholder" aria-hidden="true"></span>
          <span class="node-icon"><Icon name="box-seam" /></span>
          <span class="node-name">Unstored</span>
          <span class="node-count">({data.unstoredCount} {plural(data.unstoredCount)})</span>
        </div>
      </a>

      {#if data.locations.length === 0}
        <div class="empty">
          <p>No storage locations yet.</p>
          <p class="muted">Add a shelf, cabinet, bin or drawer to start mapping where games live.</p>
        </div>
      {:else}
        <div class="tree" role="tree" aria-label="Storage locations">
          {#each visibleLocations as node (node.id)}
            <div class="node" role="treeitem" aria-level={node.depth + 1} aria-selected="false"
                 style={`padding-inline-start: calc(var(--wa-space-m) + ${node.depth} * 24px);`}>
              <div class="node-label">
                {#if nodesWithChildren.has(node.id)}
                  <button type="button" class="node-toggle"
                          aria-label={`${collapsed.has(node.id) ? 'Expand' : 'Collapse'} ${node.name}`}
                          aria-expanded={!collapsed.has(node.id)}
                          on:click={() => toggleCollapsed(node)}>
                    <Icon name={collapsed.has(node.id) ? 'chevron-right' : 'chevron-down'} />
                  </button>
                {:else}
                  <span class="node-toggle-placeholder" aria-hidden="true"></span>
                {/if}
                <span class="node-icon"><Icon name="box-seam" /></span>
                <a class="node-name" href={`#/storage/${node.slug ?? node.id}`}
                   title={`View games stored in ${node.path}`}>{node.name}</a>
                <span class="node-count">({node.totalGameCount} {plural(node.totalGameCount)})</span>
              </div>

              <div class="node-actions">
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <wa-button size="s" appearance="plain" title="Add a sub-location"
                           aria-label={`Add a sub-location under ${node.name}`}
                           on:click={() => openCreate(node.id)}>
                  <Icon name="plus" />
                </wa-button>
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <wa-button size="s" appearance="plain" title="Rename location"
                           aria-label={`Rename ${node.name}`}
                           on:click={() => openRename(node)}>
                  <Icon name="pencil" />
                </wa-button>
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <wa-button size="s" appearance="plain" title="Delete location"
                           aria-label={`Delete ${node.name}`}
                           on:click={() => remove(node)}>
                  <Icon name="trash" />
                </wa-button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Panel>
  {/if}

  <Confirm bind:this={confirmModal} />

  {#if editor.open}
  <wa-dialog bind:this={editorDialog} open
             label={editor.mode === 'create' ? 'Add Storage Location' : 'Rename Storage Location'}
             style="min-width: min(480px, 92vw)"
             on:wa-hide={dismissed}>
    <h3 slot="header">{editor.mode === 'create' ? 'Add Storage Location' : 'Rename Storage Location'}</h3>

    {#if warning !== null}
      <wa-callout variant="warning">{warning}</wa-callout>
    {/if}

    <div class="stack">
      <!-- wa-input wraps a real input; the custom element's keydown is the one
           Svelte cannot see into. -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <wa-input label="Name"
                maxlength={editor.mode === 'rename' ? 80 : undefined}
                value={editor.name}
                on:input={e => editor = { ...editor, name: e.target.value }}
                on:keydown={editorKeydown}>
      </wa-input>

      {#if editor.mode === 'create'}
        <div class="muted hint">
          Separate multiple names with commas; they are created in order.
        </div>
      {/if}

      {#if editor.mode === 'create' && editor.parentId !== null}
        <div class="muted parent-context">
          Inside <strong>{parentPath(editor.parentId)}</strong>
        </div>
      {/if}
    </div>

    <div slot="footer" class="editor-actions">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="outlined" variant="neutral" on:click={closeEditor}
                 disabled={saving}>Cancel</wa-button>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="filled" variant="brand" on:click={save}
                 loading={saving} disabled={saving}>
        {editor.mode === 'create' ? 'Add' : 'Rename'}
      </wa-button>
    </div>
  </wa-dialog>
  {/if}
{/if}


<style>
  .unstored-row,
  .node {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 44px;
    padding: 6px 16px;
    border-bottom: 1px solid var(--wa-color-surface-border);
  }

  .unstored-row {
    background: var(--wa-color-surface-lowered);
    color: inherit;
    text-decoration: none;
  }

  .unstored-row:hover,
  .unstored-row:focus-visible {
    background: var(--wa-color-surface-default);
  }

  .node:hover {
    background: var(--wa-color-surface-lowered);
  }

  .node-label {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .node-toggle,
  .node-toggle-placeholder {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .node-toggle {
    padding: 0;
    border: 0;
    border-radius: var(--wa-border-radius-s);
    background: transparent;
    color: var(--wa-color-text-quiet);
    cursor: pointer;
  }

  .node-toggle:hover {
    color: var(--wa-color-text-normal);
    background: var(--wa-color-surface-lowered);
  }

  .node-toggle:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }

  .node-icon {
    color: var(--wa-color-text-quiet);
  }

  .node-count {
    margin-inline-start: 4px;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    font-weight: var(--wa-font-weight-normal);
    white-space: nowrap;
  }

  .node-name {
    color: var(--wa-color-text-normal);
    font-weight: var(--wa-font-weight-semibold);
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  a.node-name:hover,
  a.node-name:focus-visible {
    text-decoration: underline;
  }

  .node-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .empty {
    padding: 32px 16px;
    text-align: center;
  }

  .empty p {
    margin: 0 0 4px;
  }

  .hint {
    font-size: var(--wa-font-size-s);
  }

  .editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;
  }

  @media (max-width: 640px) {
    .node-actions {
      gap: 0;
    }
  }
</style>
