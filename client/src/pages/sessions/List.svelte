<script>
  import { api } from '$api';

  import { replaceQuery } from '$lib/router.js';

  import SessionList from '$components/lists/SessionList.svelte';
  import IconButton from '$components/IconButton.svelte';
  import SessionAddDialog from '$components/dialogs/SessionAddDialog.svelte';

  // ---------------------------------------------------------------------------
  // Route state
  // ---------------------------------------------------------------------------

  export let routeInfo = { query: {} };

  // The page remains mounted when only the query changes, so status is derived
  // from the route object rather than read once at mount. The key below
  // recreates the list when this changes, which gives the loader a fresh
  // request and resets the grid's page state. `?status=open` is the complete
  // open-session view.
  $: status = (routeInfo.query?.status === 'open') ? 'open' : 'all';
  const loader = () => api.session.list(true, undefined, status === 'open' ? 'open' : undefined);

  // The state of the add session report dialog and a token that remounts the
  // list when a report is created. On success we also visit the new report.
  let addDialogOpen = false;
  let listVersion = 0;

  // The dialog opens once per route object carrying `add=1`. `replaceQuery()`
  // rewrites the URL without updating the route store, so a plain reactive
  // read of the query would either reopen after dismissal or fail to reopen on
  // a later profile navigation. This guard marks the route object as consumed.
  let consumedAddRoute = null;

  $: if (routeInfo !== consumedAddRoute) {
    consumedAddRoute = routeInfo;

    if (routeInfo.query?.add === '1') {
      addDialogOpen = true;
    }
  }

  const addClosed = detail => {
    addDialogOpen = false;

    // Drop the shortcut query before leaving or settling. The consumed route
    // guard above keeps the dialog closed even though the route store still
    // holds the old query object.
    if (routeInfo.query?.add === '1') {
      replaceQuery({ add: undefined });
    }

    if (detail?.result !== null && detail?.result !== undefined) {
      listVersion += 1;
      window.location.hash = `#/session/${detail.result.sessionId}`;
    }
  };
</script>

<h3>Session Reports</h3>

{#if status === 'open'}
  <div class="filter-note">
    Showing open sessions only.
    <a href="#/sessions">Show all sessions</a>
  </div>
{/if}

{#key `${listVersion}:${status}`}
  <SessionList {loader} fill gridKey="sessions" {status}
               showOpenPanel={status === 'all'}>
    <svelte:fragment slot="actions">
      <IconButton variant="brand" appearance="filled" title="Add a new session report"
                  caption="" icon="plus-lg"
                  onclick={() => addDialogOpen = true} />
    </svelte:fragment>
  </SessionList>
{/key}

{#if addDialogOpen}
  <SessionAddDialog open={true} onclose={addClosed} />
{/if}

<style>
  .filter-note {
    margin: -8px 0 12px;
    color: var(--wa-color-text-quiet);
  }
</style>
