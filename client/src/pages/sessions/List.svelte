<script>
  import { api } from '$api';

  import SessionList from '$components/lists/SessionList.svelte';
  import IconButton from '$components/IconButton.svelte';
  import SessionAddDialog from '$components/dialogs/SessionAddDialog.svelte';

  // Fetch a list of all of the session reports known to the system.
  const loader = async () => api.session.list(true)

  // The state of the add session report dialog. The dialog is a stub until
  // saving lands, so nothing needs refreshing when it closes.
  let addDialogOpen = false;
</script>

<h3>Session Reports</h3>
<SessionList {loader} fill gridKey="sessions">
  <svelte:fragment slot="actions">
    <IconButton variant="brand" appearance="filled" title="Add a new session report"
                caption="" icon="plus-lg"
                onclick={() => addDialogOpen = true} />
  </svelte:fragment>
</SessionList>

<SessionAddDialog open={addDialogOpen} onclose={() => addDialogOpen = false} />
