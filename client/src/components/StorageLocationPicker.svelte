<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';

  import { user } from '$stores/user';

  import StorageTreeNode from '$components/StorageTreeNode.svelte';

  // The flat storage list returned by the API, the currently selected location
  // (null is the virtual Unstored bucket), and a name that separates the
  // remembered expansion state of one consumer from another.
  export let locations = [];
  export let value = null;
  export let consumer = 'default';
  export let allowUnstored = false;

  const dispatch = createEventDispatcher();

  // The tree's expansion is stored per picker consumer, not inside the generic
  // tree component. This keeps the game dialog, the storage-page move dialog
  // and the Unstored assignment dialog from rearranging one another.
  let expandedIds = new SvelteSet();
  let query = '';

  $: locationsById = new Map(locations.map(location => [location.id, location]));

  $: childrenById = locations.reduce((children, location) => {
    if (location.parentId !== null && location.parentId !== undefined) {
      if (children.has(location.parentId) === false) {
        children.set(location.parentId, []);
      }

      children.get(location.parentId).push(location);
    }

    return children;
  }, new Map());

  $: roots = locations.filter(location =>
    location.parentId === null ||
    location.parentId === undefined ||
    locationsById.has(location.parentId) === false
  );

  $: selectedNode = (value === null) ? null : (locationsById.get(Number(value)) ?? null);
  $: selectedLabel = (value === null)
    ? (allowUnstored ? 'Unstored' : 'Choose a location')
    : (selectedNode?.path ?? 'Choose a location');

  $: normalizedQuery = query.trim().toLocaleLowerCase();
  $: matches = (normalizedQuery === '')
    ? []
    : locations.filter(location =>
        location.path.toLocaleLowerCase().includes(normalizedQuery)
      );

  const storageKey = () =>
    `luddatumbazo:storage-tree:${consumer}:${$user.household?.slug ?? 'none'}`;

  const saveExpansion = () => {
    try {
      localStorage.setItem(storageKey(), JSON.stringify([...expandedIds]));
    }
    catch {
      // Storage can be unavailable in private browsing or when the quota is
      // exhausted; the tree simply will not remember its state in that case.
    }
  };

  const ancestorsFor = id => {
    const ancestors = [];
    const seen = [];
    let current = locationsById.get(Number(id));

    while (current !== null && current !== undefined) {
      if (seen.includes(current.id)) {
        break;
      }

      seen.push(current.id);
      current = (current.parentId === null || current.parentId === undefined)
        ? null
        : locationsById.get(current.parentId);

      if (current !== null && current !== undefined) {
        ancestors.push(current.id);
      }
    }

    return ancestors;
  };

  const reveal = id => {
    const next = new SvelteSet(expandedIds);

    for (const ancestorId of ancestorsFor(id)) {
      next.add(ancestorId);
    }

    expandedIds = next;
    saveExpansion();
  };

  const loadExpansion = () => {
    try {
      const stored = localStorage.getItem(storageKey());

      if (stored !== null) {
        const values = JSON.parse(stored);
        expandedIds = new SvelteSet(
          Array.isArray(values)
            ? values
                .map(value => Number(value))
                .filter(value => Number.isInteger(value) && locationsById.has(value))
            : []
        );
        return;
      }
    }
    catch {
      // Fall through to the default expansion below.
    }

    // With no remembered state, reveal the current selection's path; a bulk
    // picker has no selection, so it starts with all roots collapsed.
    expandedIds = new SvelteSet(value === null ? [] : ancestorsFor(value));
  };

  onMount(loadExpansion);

  const choose = nextValue => {
    const id = (nextValue === null) ? null : Number(nextValue);

    if (id !== null && locationsById.has(id) === false) {
      return;
    }

    if (id !== null) {
      reveal(id);
    }

    value = id;
    query = '';
    dispatch('change', { value: id });
  };

  const selectionChanged = event => {
    const selected = event.detail?.selection?.[0];
    const id = Number(selected?.dataset?.locationId);

    if (Number.isInteger(id)) {
      choose(id);
    }
  };

  const expansionChanged = event => {
    const id = Number(event.target?.dataset?.locationId);

    if (Number.isInteger(id) === false) {
      return;
    }

    const next = new SvelteSet(expandedIds);

    if (event.type === 'wa-expand') {
      next.add(id);
    }
    else {
      next.delete(id);
    }

    expandedIds = next;
    saveExpansion();
  };

  const searchKeydown = event => {
    if (event.key !== 'Enter' || event.isComposing === true) {
      return;
    }

    // Read the field itself rather than the reactive copy: Enter can arrive in
    // the same tick as the last typed character.
    const search = String(event.target.value ?? '').trim().toLocaleLowerCase();
    const match = (search === '')
      ? undefined
      : locations.find(location => location.path.toLocaleLowerCase().includes(search));

    if (match === undefined) {
      return;
    }

    event.preventDefault();
    choose(match.id);
  };
</script>


<div class="picker">
  {#if allowUnstored}
    <button type="button" class="unstored-option" class:selected={value === null}
            aria-pressed={value === null} on:click={() => choose(null)}>
      <span class="option-copy">
        <span class="option-title">Unstored</span>
        <span class="option-detail">No storage location</span>
      </span>
    </button>
  {/if}

  <!-- wa-input wraps a real input; the custom element's keydown is the one
       Svelte cannot see into. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <wa-input type="search" label="Find a location" placeholder="Search storage locations"
            value={query} with-clear
            on:input={event => query = event.target.value}
            on:keydown={searchKeydown}>
    <wa-icon library="system" name="magnifying-glass" slot="start"></wa-icon>
  </wa-input>

  {#if normalizedQuery !== ''}
    <div class="results-wrap">
      {#if matches.length > 0}
        <ul class="results">
          {#each matches as match (match.id)}
            <li>
              <button type="button" class="result" class:selected={value === match.id}
                      on:click={() => choose(match.id)}>
                <span class="result-path">{match.path}</span>
                <span class="result-count">{match.totalGameCount}</span>
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="empty">No locations match.</p>
      {/if}
    </div>
  {/if}

  <!-- Keep the tree mounted while results are showing so searching and
       choosing a result does not reset the expansion the user set. -->
  <div class="tree-wrap" hidden={normalizedQuery !== ''}>
    {#if roots.length > 0}
      <wa-tree selection="single" aria-label="Storage locations"
               on:wa-selection-change={selectionChanged}
               on:wa-expand={expansionChanged}
               on:wa-collapse={expansionChanged}>
        {#each roots as root (root.id)}
          <StorageTreeNode node={root} {childrenById} selectedId={value}
                           {expandedIds} />
        {/each}
      </wa-tree>
    {:else}
      <p class="empty">No storage locations yet.</p>
    {/if}
  </div>

  <div class="summary">
    <span class="muted">Selected</span>
    <strong>{selectedLabel}</strong>
  </div>
</div>


<style>
  .picker {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  .unstored-option {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-lowered);
    color: var(--wa-color-text-normal);
    text-align: left;
    cursor: pointer;
  }

  .unstored-option:hover,
  .unstored-option:focus-visible {
    border-color: var(--wa-color-brand-border-loud);
  }

  .unstored-option.selected {
    border-color: var(--wa-color-brand-border-loud);
    box-shadow: inset 0 0 0 1px var(--wa-color-brand-border-loud);
  }

  .option-copy {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .option-title {
    font-weight: var(--wa-font-weight-semibold);
  }

  .option-detail {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  .tree-wrap,
  .results-wrap {
    max-height: 280px;
    overflow-y: auto;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-default);
    padding: 6px;
  }

  wa-tree {
    display: block;
    --indent-size: 18px;
    --indent-guide-width: 1px;
  }

  .results {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .result {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 7px 8px;
    border: 0;
    border-radius: var(--wa-border-radius-s);
    background: transparent;
    color: var(--wa-color-text-normal);
    text-align: left;
    cursor: pointer;
  }

  .result:hover,
  .result:focus-visible {
    background: var(--wa-color-surface-lowered);
  }

  .result.selected {
    background: var(--wa-color-brand-fill-quiet);
  }

  .result-path {
    overflow-wrap: anywhere;
  }

  .result-count {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    white-space: nowrap;
  }

  .empty {
    margin: 0;
    padding: 16px 8px;
    color: var(--wa-color-text-quiet);
    text-align: center;
  }

  .summary {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    padding-top: 8px;
    border-top: 1px solid var(--wa-color-surface-border);
  }

  .summary strong {
    overflow-wrap: anywhere;
  }
</style>
