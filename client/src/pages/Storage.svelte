<script>
  import { onMount } from 'svelte';

  import { api } from '$api';
  import { user } from '$stores/user';

  import Confirm from '$components/Confirm.svelte';
  import Icon from '$components/Icon.svelte';

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

  let confirmModal = null;

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

  onMount(load);

  // ---------------------------------------------------------------------------
  // Editor
  // ---------------------------------------------------------------------------

  const openCreate = (parentId = null) => {
    editor = { open: true, mode: 'create', id: null, name: '', parentId };
    warning = null;
  };

  const openRename = node => {
    editor = { open: true, mode: 'rename', id: node.id, name: node.name, parentId: node.parentId };
    warning = null;
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

  const save = async () => {
    if (saving === true) {
      return;
    }

    const name = editor.name.trim();
    if (name === '') {
      warning = 'Enter a name for this storage location.';
      return;
    }

    saving = true;
    warning = null;

    try {
      if (editor.mode === 'create') {
        await api.household.storage.create($user.household, name, editor.parentId);
      }
      else {
        await api.household.storage.update($user.household, editor.id, name);
      }

      editor = { ...editor, open: false };
      await load();
    }
    catch (failure) {
      warning = failure.message ?? 'unable to save the storage location';
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

  // The path of the location currently open in the editor. Creation is always
  // either top level or initiated from a specific node, so the parent is shown
  // as context rather than as a second dropdown.
  const parentPath = id => data.locations.find(location => location.id === id)?.path;
</script>


{#if !$user.household}
  <h3>Storage</h3>
  <p>No storage; you do not belong to a household yet.</p>
{:else}
  <div class="page-head">
    <div>
      <h3>Storage for {$user.household.name}</h3>
      <p class="muted">
        Organize shelves, cabinets, cubbies and drawers. Games without a
        location are listed as Unstored.
      </p>
    </div>

    <!-- wa-button wraps a real <button>; the a11y warnings are false positives. -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <wa-button appearance="filled" variant="brand" on:click={() => openCreate(null)}>
      <Icon name="plus" padRight="4px" /> Add location
    </wa-button>
  </div>

  {#if actionError !== null}
    <wa-callout variant="warning">{actionError}</wa-callout>
  {/if}

  {#if error !== null}
    <wa-callout variant="danger">{error}</wa-callout>
  {:else if loading}
    <div class="loading"><wa-spinner></wa-spinner></div>
  {:else}
    <div class="summary">
      <div class="summary-card">
        <span class="summary-label">Unstored</span>
        <strong>{data.unstoredCount}</strong>
        <span class="muted">games</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Off shelf</span>
        <strong>{data.offShelfCount}</strong>
        <span class="muted">games</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Locations</span>
        <strong>{data.locations.length}</strong>
        <span class="muted">defined</span>
      </div>
    </div>

    <div class="storage-panel">
      <div class="tree-head">
        <strong>Locations</strong>
        <span class="muted">Select a game from the collection to assign it.</span>
      </div>

      <div class="unstored-row" role="treeitem" aria-level="1" aria-selected="false">
        <div class="node-label">
          <span class="node-icon"><Icon name="box-seam" /></span>
          <span class="node-name">Unstored</span>
          <span class="muted">{data.unstoredCount} {plural(data.unstoredCount)}</span>
        </div>
      </div>

      {#if data.locations.length === 0}
        <div class="empty">
          <p>No storage locations yet.</p>
          <p class="muted">Add a shelf, cabinet, bin or drawer to start mapping where games live.</p>
        </div>
      {:else}
        <div class="tree" role="tree" aria-label="Storage locations">
          {#each data.locations as node (node.id)}
            <div class="node" role="treeitem" aria-level={node.depth + 1} aria-selected="false"
                 style={`padding-inline-start: calc(var(--wa-space-m) + ${node.depth} * 24px);`}>
              <div class="node-label">
                <span class="node-icon"><Icon name="box-seam" /></span>
                <a class="node-name" href={`#/storage/${node.id}`}
                   title={`View games stored in ${node.path}`}>{node.name}</a>
                <span class="muted">{node.totalGameCount} {plural(node.totalGameCount)}</span>
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
    </div>
  {/if}

  <Confirm bind:this={confirmModal} />

  {#if editor.open}
  <wa-dialog open
             label={editor.mode === 'create' ? 'Add Storage Location' : 'Rename Storage Location'}
             style="min-width: min(480px, 92vw)" on:wa-hide={dismissed}>
    <h3 slot="header">{editor.mode === 'create' ? 'Add Storage Location' : 'Rename Storage Location'}</h3>

    {#if warning !== null}
      <wa-callout variant="warning">{warning}</wa-callout>
    {/if}

    <div class="stack">
      <wa-input label="Name" maxlength="80" value={editor.name}
                on:input={e => editor = { ...editor, name: e.target.value }}>
      </wa-input>

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
  .page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .page-head p {
    margin: 4px 0 0;
  }

  .loading {
    display: flex;
    justify-content: center;
    padding: 32px;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .summary-card {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 12px;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-lowered);
  }

  .summary-label {
    flex: 1 1 100%;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .summary-card strong {
    font-size: var(--wa-font-size-xl);
  }

  .storage-panel {
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-default);
    overflow: hidden;
  }

  .tree-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-bottom: 1px solid var(--wa-color-surface-border);
    background: var(--wa-color-surface-lowered);
  }

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

  .node-icon {
    color: var(--wa-color-text-quiet);
  }

  .node-name {
    color: var(--wa-color-text-normal);
    font-weight: var(--wa-font-weight-semibold);
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  .node-name:hover,
  .node-name:focus-visible {
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

  .editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;
  }

  @media (max-width: 640px) {
    .tree-head .muted {
      display: none;
    }

    .node-actions {
      gap: 0;
    }
  }
</style>
