<script>
  import { location } from 'svelte-spa-router';

  import SlugList from '$components/SlugList.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The type of metadata that this particular page is displaying the details
  // for; this allows us to adjust things like the data query to match the
  // type of meta we're detailing.
  export let metaType;

  // ---------------------------------------------------------------------------

  // Pluck the slug from the end of our URI; this can be either a number or the
  // named slug.
  const slug = $location.split('/').at(-1);

  // Default the name on the page to the slug that was used to load it, until
  // the data is fully loaded. This could also be smarter and just not display
  // anything there to start with.
  let name = slug;

  // The result of the query gives us the game details in a sub key instead of
  // at the top level, and the field that represents the game is named
  // differently to make it more obvious what it is. So we need to filter the
  // data down so the slug list can ingest it.
  const gameFilter = result => {
    // Set the name field so the page updates.
    name = result.data.name;

    // The records to display are in the games list, where we need to adjust the
    // ID field to match what the slug list wants.
    return result.data.games.map(game => {
      game.id = game.gameId;
      return game;
    });
  }
</script>

<h3>{metaType}: {name}</h3>
<SlugList bggType='boardgame' baseLink='#/game/:slug'
          query='/game/meta/{metaType}/{slug}?games'
          filter={gameFilter} />

<style>
  h3 {
    text-transform: capitalize;
  }
</style>