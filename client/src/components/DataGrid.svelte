<script>
  import { onMount } from 'svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The row objects to display.
  export let data = [];

  // The WaDataGrid column definitions.
  export let columns = [];

  // The number of rows per page.
  export let pageSize = 25;

  // Identifies this grid in localStorage so the user's page size choice is
  // remembered across visits. Only the top level grids are given a key; grids
  // that sit inline inside other pages simply use whatever they are given.
  export let gridKey = undefined;

  // The ladder of page sizes the picker offers.
  const basePageSizes = [10, 25, 50, 100];

  // Show the search box above the grid.
  export let withSearch = true;

  // Render alternating row background colors.
  export let striped = true;

  // When set, the grid takes up all of the vertical space that the page leaves
  // for it instead of growing to its natural height, scrolling its rows inside
  // of the grid. Page level lists use this so that everything fits the window
  // without the page growing a scrollbar that matches nothing visible.
  export let fill = false;

  // ---------------------------------------------------------------------------

  // The grid element; the toolbar's search box feeds the grid's own filtering
  // machinery through it, since the toolbar lives out here where pages can add
  // their own buttons next to the search.
  let grid = null;

  // Restore the user's remembered page size before the grid first renders;
  // when there is no remembered value the provided (or default) size stands.
  if (gridKey !== undefined) {
    const saved = parseInt(localStorage.getItem(`luddatumbazo:grid-page-size:${gridKey}`) ?? '', 10);
    if (Number.isInteger(saved) && saved > 0) {
      pageSize = saved;
    }
  }

  // The picker offers the standard ladder plus whatever size is actually in
  // force. Inline grids clamp their size to their row count (an inline list of
  // five rows shows five), and without this the picker would display a value
  // that is not one of its own options.
  $: pageSizes = [...new Set([...basePageSizes, pageSize])].sort((a, b) => a - b);

  // pageSizeOptions is a property with no attribute form, so it is handed to
  // the grid directly whenever it or the grid element changes.
  $: if (grid !== null) {
    grid.pageSizeOptions = pageSizes;
  }

  // When the user picks a page size on a grid that opted in, remember the
  // choice for the next visit.
  const pageChanged = event => {
    const size = event.detail?.pageSize;

    if (gridKey === undefined || Number.isInteger(size) === false || size <= 0) {
      return;
    }

    localStorage.setItem(`luddatumbazo:grid-page-size:${gridKey}`, String(size));
    pageSize = size;
  };

  // Push the search terms typed into the toolbar's search box into the grid.
  const search = event => {
    if (grid !== null) {
      grid.searchTerm = event.target.value;
    }
  };

  // wa-data-grid measures its own header labels after layout and widens any
  // fixed column that would otherwise clip its label ("ID" -> "I..."). Grids
  // that mount hidden inside a tab panel measure zero-width glyphs and never
  // recover, so re-run the measurement whenever the grid changes size or
  // becomes visible.
  const remeasure = () => {
    requestAnimationFrame(() => grid?.refreshHeaderMinWidths?.());
  };

  onMount(() => {
    remeasure();

    const observer = new ResizeObserver(remeasure);
    observer.observe(grid);

    return () => observer.disconnect();
  });
</script>


<div class="grid-wrap" class:fill>
  {#if withSearch}
    <div class="grid-toolbar">
      <wa-input
        class="grid-search wa-visually-hidden-label"
        type="search"
        size="m"
        label="Search"
        placeholder="Search"
        with-clear
        on:input={search}
      >
        <wa-icon library="system" name="magnifying-glass" slot="start"></wa-icon>
      </wa-input>

      <div class="grid-actions">
        <slot name="actions" />
      </div>
    </div>
  {/if}

  <!-- The grid's own search box stays off (`withSearch` defaults to false; do
       not add the attribute here; a `with-search="false"` attribute is still
       a present boolean attribute and turns the box on). The toolbar's search
       drives the grid through `searchTerm` instead. -->
  <wa-data-grid
    bind:this={grid}
    {data}
    {columns}
    {striped}
    paginate
    page-size={pageSize}
    on:wa-page-change={pageChanged}
  ></wa-data-grid>
</div>


<!-- *********************************************************************** -->


<style>
  .grid-wrap {
    display: flex;
    flex-direction: column;
    border: var(--wa-border-width-s) solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-default);
    overflow: hidden;
    min-width: 0;
  }

  /* The toolbar row matches the grid's own rhythm: a search box on the left
   * and, pushed to the far end, the container where pages drop the buttons for
   * their operations. */
  .grid-toolbar {
    display: flex;
    align-items: center;
    gap: var(--wa-space-s);
    width: 100%;
    padding: var(--wa-space-m);
    border-bottom: var(--wa-border-width-s) solid var(--wa-color-surface-border);
  }

  .grid-search {
    flex: 0 1 20rem;
    max-width: 20rem;
  }

  .grid-actions {
    display: flex;
    align-items: center;
    gap: var(--wa-space-s);
    margin-inline-start: auto;
    flex-wrap: wrap;
  }
</style>
