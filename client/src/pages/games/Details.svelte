<script>
  import { LoadZone, Paper, Titlebar, Link, Text,  Flex, Grid, Button, Icon } from "@axel669/zephyr";

  import { location, push } from 'svelte-spa-router';

  // ---------------------------------------------------------------------------

  // The base link to the API
  const API = `${process.env.GAME_API_ROOT_URI}/api/v1`;
  const bggLink = bggId => `https://boardgamegeek.com/boardgame/${bggId}/`;

  // Pluck the slug from the end of our URI; this can be either a number or the
  // named slug.
  const slug = $location.split('/').at(-1);

  // Cause the router to jump back to the base
  const back = () => push('/games');

  // The list of keys that represent metadata in the returned game object, what
  // titles they should have, and what order to display them in.
  const metaKeys = [
    { "key": "designer",  "title": "Designers:" },
    { "key": "artist",    "title": "Artists:" },
    { "key": "category",  "title": "Categories:" },
    { "key": "mechanic",  "title": "Mechanics:" },
    { "key": "publisher", "title": "Publishers:" },
  ];

  // ---------------------------------------------------------------------------

  // Fetch the list of data that we need from the back end API, and return
  // the result back.
  const loadData = async () => {
    const dataURI = `${API}/game/${slug}`;

    const response = await fetch(dataURI);
    const result = await response.json();

    return result.data;
  };
</script>


<Flex direction="row">
  <Button fill color="secondary"  on:click={back}> <Icon name="arrow-left"></Icon> </Button>
  <h3>Game Details</h3>
</Flex>

<LoadZone source={loadData()} let:result>
  <Paper>
    <Titlebar slot="header">
      <Flex p="0px" gap="0px" slot="title">
        <Text title> {result.names[0]} ({result.publishedIn})</Text>
        <Text subtitle>
          <Flex direction="row" gap="16px" fl.wr="wrap">
            <span>
              <strong>Players:</strong>
                {#if result.minPlayers === result.maxPlayers}
                  {result.minPlayers}
                {:else}
                  {result.minPlayers}-{result.maxPlayers}
                {/if}
            </span>
            <span>
              <strong>Play Time:</strong>
                {#if result.minPlaytime === result.maxPlaytime}
                  {result.minPlaytime} minutes
                {:else}
                  {result.minPlaytime}-{result.maxPlaytime} minutes
                {/if}
              </span>
            <span><strong>Age:</strong> {result.minPlayerAge}+</span>
            <span><strong>Weight:</strong> {result.complexity.toFixed(2)}/5</span>
          </Flex>
        </Text>
      </Flex>
    </Titlebar>
    <Flex gap="16px" fl.wr="wrap">

      {#if result.imagePath !== undefined}
        <div ws-x="t.a[center]">
          <img src={result.imagePath} alt="Box art image for game {result.name}">
        </div>
      {/if}

      <Text subtitle>
        {#if result.names.length > 1}
          <Flex direction="row" gap="8px">
            <strong>Also Known As:</strong>
            {result.names.slice(1).join(', ')}
          </Flex>
        {/if}
        <Flex direction="row" gap="32px" fl.wr="wrap">
          {#if result.bggId !== 0}
            <Link href="{bggLink(result.bggId)}" target="_blank">
              View on BoardGameGeek <Icon name="external-link"></Icon>
            </Link>
          {/if}

          {#if result.officialURL !== ''}
            <Link href="{result.officialURL}" target="_blank">
              View Official Site <Icon name="external-link"></Icon>
            </Link>
          {:else}
            <span>No Official Site Available</span>
          {/if}
          {#if result.teachingURL !== ''}
            <Link href="{result.teachingURL}" target="_blank">
              Learn to Play <Icon name="external-link"></Icon>
            </Link>
          {:else}
            <span>No Learning Video available</span>
          {/if}
        </Flex>
      </Text>

      <Grid cols="max-content auto" gap="8px">
        {#each metaKeys as metadata (metadata.key) }
          <Flex>{metadata.title}</Flex>
          <Flex direction="row" gap="4px" fl.wr="wrap">
            {#each result[metadata.key] as row (row.id)}
              <Link href="#/{metadata.key}/{row.slug}">{row.name}</Link>
            {/each}
          </Flex>
        {/each}
      </Grid>

      <Text p="8px" b.t="1.5px solid gray">
        {@html result.description}
      </Text>
    </Flex>
  </Paper>

</LoadZone>


<style>
  h3 {
    text-transform: capitalize;
  }
</style>