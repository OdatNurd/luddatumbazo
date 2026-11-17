<script>
  import { api } from '$api';

  import SessionList from '$components/lists/SessionList.svelte';
  import IconButton from '$components/IconButton.svelte';
  import SessionAddDialog from '$components/dialogs/SessionAddDialog.svelte';

  // Fetch a list of all of the session reports known to the system.
  const loader = async () => api.session.list(true)

  // The state of the add session report dialog and a token that remounts the
  // list when a report is created. On success we also visit the new report.
  let addDialogOpen = false;
  let listVersion = 0;

  const addClosed = detail => {
    addDialogOpen = false;

    if (detail?.result !== null && detail?.result !== undefined) {
      listVersion += 1;
      window.location.hash = `#/session/${detail.result.sessionId}`;
    }
  };
</script>

<h3>Session Reports</h3>
{#key listVersion}
  <SessionList {loader} fill gridKey="sessions">
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
