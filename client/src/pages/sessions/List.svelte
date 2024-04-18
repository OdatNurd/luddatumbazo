<script>
  import { api } from '$api';

  import SessionList from '$components/SessionList.svelte';

  // Fetch a list of all of the session reports known to the system.
  const loader = async () => api.session.list(true)
</script>

<h3>Session Reports</h3>
<SessionList {loader} />
