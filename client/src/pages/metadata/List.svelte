<script>
  import { api } from '$api';

  import SlugList from '$components/lists/SlugList.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The type of metadata that this list is supposed to contain. This controls
  // how this page sources its data and what links it generates.
  export let metaType = 'artist';

  const loader = async () => api.metadata.list(metaType);
</script>

<h3>{metaType} List</h3>
<SlugList bggType='boardgame{metaType}' baseLink='#/{metaType}/:slug' {loader} />

<style>
  h3 {
    text-transform: capitalize;
  }
</style>