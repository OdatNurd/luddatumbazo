<script>
  import SlugList from '$components/SlugList.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The type of metadata that this list is supposed to contain. This controls
  // how this page sources its data and what links it generates.
  export let metaType = 'artist';
</script>

<h3>{metaType} List</h3>
<SlugList bggType='boardgame{metaType}' baseLink='#/{metaType}/:slug' query='/game/meta/{metaType}/list' />

<style>
  h3 {
    text-transform: capitalize;
  }
</style>