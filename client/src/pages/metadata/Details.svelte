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

  // The result of the query gives us the game details in a sub key instead of
  // at the top level, and the field that represents the game is named
  // differently to make it more obvious what it is. So we need to filter the
  // data down so the slug list can ingest it.
  const gameFilter = result => result.data.games.map(game => {
    game.id = game.gameId;
    return game;
  });
</script>

I am details of a metadata {metaType} for slug '{slug}'

<SlugList bggType='boardgame' baseLink='#/game/:slug'
          query='/game/meta/{metaType}/{slug}?games'
          filter={gameFilter} />
