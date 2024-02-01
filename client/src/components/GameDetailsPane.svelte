<script>
  import { LoadZone, Paper, Titlebar, Link, Text,  Flex, Grid, Button, Icon } from "@axel669/zephyr";
  import { push } from 'svelte-spa-router';

  import BackButton from '$components/BackButton.svelte';
  import BGGLink from '$components/BGGLink.svelte';
  import GameImage from '$components/GameImage.svelte';

  import { api } from '$lib/fetch.js';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The slug that represents our game; used in our lookup in order to know what
  // game to get details for.
  export let slug;

  // ---------------------------------------------------------------------------

  // Cause the router to jump to the list of sessions for this particular
  // game.
  const sessionList = () => push(`/game/${slug}/sessions`);

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
    const dataURI = `/game/${slug}`;

    const response = await api(dataURI);
    const result = await response.json();

    return result.data;
  };
</script>


<Flex direction="row">
  <BackButton />
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
      <GameImage imagePath={result.imagePath} name={result.names[0]} />

      <Text subtitle>
        {#if result.names.length > 1}
          <Flex direction="row" gap="8px">
            <strong>Also Known As:</strong>
            {result.names.slice(1).join(', ')}
          </Flex>
        {/if}
        <Flex direction="row" gap="32px" fl.wr="wrap">
          <BGGLink bggId={result.bggId}>
            View on BoardGameGeek
            <span slot="nolink">No BGG Link available</span>
          </BGGLink>

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

      <Flex direction="row" gap="32px" fl.wr="wrap">
        <Button fill color="@secondary" disabled on:click={() => push('/')}>
          <Icon name="plus"></Icon>
          Log a Session
        </Button>

        <Button fill color="@secondary" disabled={!result.hasSessions} on:click={sessionList}>
          <Icon name="report-analytics"></Icon>
          {#if result.hasSessions}
            View Session Reports
          {:else}
            No logged sessions
          {/if}
        </Button>
      </Flex>

      <Text p="8px" b.t="1.5px solid gray" b.b="1.5px solid gray">
        {@html result.description}
      </Text>

      {#if result.expansionGames.length > 0}
        <Grid cols="max-content auto" gap="8px">
          <Flex>Expansions:</Flex>
          <Flex direction="row" gap="4px" fl.wr="wrap">
            {#each result.expansionGames as row (row.id)}
              {#if row.id !== null}
                <Link href="#/game/{row.slug}">{row.name}</Link>
              {:else}
                <BGGLink bggId={row.bggId}>{row.name}</BGGLink>
              {/if}
            {/each}
          </Flex>
        </Grid>
      {/if}

      {#if result.baseGames.length > 0}
        <Grid cols="max-content auto" gap="8px">
          <Flex>Expands:</Flex>
          <Flex direction="row" gap="4px" fl.wr="wrap">
            {#each result.baseGames as row (row.id)}
              {#if row.id !== null}
                <Link href="#/game/{row.slug}">{row.name}</Link>
              {:else}
                <BGGLink bggId={row.bggId}>{row.name}</BGGLink>
              {/if}
            {/each}
          </Flex>
        </Grid>
      {/if}

    </Flex>
  </Paper>

</LoadZone>


<style>
  h3 {
    text-transform: capitalize;
  }
</style>