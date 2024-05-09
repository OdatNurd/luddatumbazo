<script>
  import { api } from '$api';

  import BackButton from '$components/BackButton.svelte';
  import SlugList from '$components/SlugList.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The type of metadata that this particular page is displaying the details
  // for; this allows us to adjust things like the data query to match the
  // type of meta we're detailing.
  export let metaType;

  // Receive paramters from the URL route that landed us on this page; this
  // will contain the slug that we need in order to display the details pane.
  // The paramters come from the named arguments in the route itself.
  export let params = {};

  // ---------------------------------------------------------------------------

  // Default the name on the page to the slug that was used to load it, until
  // the data is fully loaded. This could also be smarter and just not display
  // anything there to start with.
  let name = params.slug;

  // Our loader queries the details for all games that are associated with the
  // provided metadata.
  const loader = async () => api.metadata.details(metaType, name, true);

  // The result of the query gives us the game details in a sub key instead of
  // at the top level, and the field that represents the game is named
  // differently to make it more obvious what it is. So we need to filter the
  // data down so the slug list can ingest it.
  const gameFilter = result => {
    // Set the name field so the page updates.
    name = result.name;

    // The records to display are in the games list, where we need to adjust the
    // ID field to match what the slug list wants.
    return result.games.map(game => {
      game.id = game.gameId;
      return game;
    });
  }

</script>


<BackButton>
  <h3>{metaType}: {name}</h3>
</BackButton>

<SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} filter={gameFilter} />


<style>
  h3 {
    text-transform: capitalize;
  }
</style>