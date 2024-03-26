<script>
  import { LoadZone, Paper, Titlebar, Link, Text,  Flex, Grid, Button, Icon } from "@axel669/zephyr";
  import { push } from 'svelte-spa-router';

  import { user } from '$stores/user';

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


  // The loaded game data for the page; populated on page load
  let gameData = undefined;

  // Fetch the game details; if the current user has a primary household, then
  // this should also fetch ownership information based on that.
  const loadData = async () => {
    gameData = await api.get(`/game/${slug}`, {
      household: $user?.household.slug
    });

    console.log(gameData);
  }

  // Return the color to use for a metadata link based on whether or not the
  // current user owns it; gameData is the data for the game, metaDataType is
  // the type of metadata being displayed, and rowData is the actual metadata
  // item.
  const metaColor = (gameData, metaDataType, rowData) => {
    // If the game is owned, and the metadata type being displayed is the one
    // from the ownership record, and the ID is the ID of the item that's owned,
    // color the text.
    if (gameData.owned !== undefined) {
      const { publisherId, metatype } = gameData.owned;

      // Mild hack; the publisherId is here because this is expected to only
      // ever color a publisher since that is the only thing in the ownership
      // record.
      if (metaDataType === metatype && rowData.id === publisherId) {
        return "@primary";
      }
    }

    // Fallback; use normal text color.
    return null;
  }

  // Carry out a collection action; simple helper that bundles the appropriate
  // request to the given URI and returns what it does.
  const action = async (doInsert, URI, game, name, publisher) => {
    const func = (doInsert === true) ? api.put : api.delete;
    return await func(URI, { game, name, publisher });
  }

  // Insert or remove a game from the owned collection for this household.
  const collection = async (doInsert, game, name, publisher) => {
    const result = await action(doInsert, `/household/collection/${$user?.household.slug}`, game, name, publisher);

    if (doInsert === true) {
      gameData.owned = result;
      delete gameData.wishlist;
    } else {
      delete gameData.owned;
    }

    // Trigger a refesh.
    gameData = gameData;
  }

  // Insert or remove a game from the wishlist for this household.
  const wishlist = async (doInsert, game, name) => {
    const result = await action(doInsert, `/household/wishlist/${$user?.household.slug}`, game, name);

    if (doInsert === true) {
      gameData.wishlist = result;
    } else {
      delete gameData.wishlist;
    }

    // Trigger a refesh.
    gameData = gameData;
  }
</script>


<Flex direction="row">
  <BackButton />
  <h3>Game Details</h3>
</Flex>

<LoadZone source={loadData()}>
  <Paper>
    <Titlebar slot="header">
      <Flex p="0px" gap="0px" slot="title">
        <Text title>
          {#if gameData.owned !== undefined}
            <Icon name="star-filled">{gameData.owned.gameName} ({gameData.publishedIn})</Icon>
          {:else}
            {#if gameData.wishlist !== undefined}
              <Icon name="heart-filled">{gameData.wishlist.name} ({gameData.publishedIn}) [Added by: {gameData.wishlist.wishlisterName}]</Icon>
            {:else}
              <Icon name="star-off">{gameData.primaryName} ({gameData.publishedIn})</Icon>
            {/if}
          {/if}
        </Text>
        <Text subtitle>
          <Flex direction="row" gap="16px" fl.wr="wrap">
            <span>
              <strong>Players:</strong>
                {#if gameData.minPlayers === gameData.maxPlayers}
                  {gameData.minPlayers}
                {:else}
                  {gameData.minPlayers}-{gameData.maxPlayers}
                {/if}
            </span>
            <span>
              <strong>Play Time:</strong>
                {#if gameData.minPlaytime === gameData.maxPlaytime}
                  {gameData.minPlaytime} minutes
                {:else}
                  {gameData.minPlaytime}-{gameData.maxPlaytime} minutes
                {/if}
              </span>
            <span><strong>Age:</strong> {gameData.minPlayerAge}+</span>
            <span><strong>Weight:</strong> {gameData.complexity.toFixed(2)}/5</span>
          </Flex>
        </Text>
      </Flex>
    </Titlebar>
    <Flex gap="16px" fl.wr="wrap">
      <GameImage imagePath={gameData.imagePath} name={gameData.primaryName} />

      <Text subtitle>
        {#if gameData.names.length > 1}
          <Flex direction="row" gap="8px">
            <strong>Also Known As:</strong>
            {gameData.names.map(el => el.name).join(', ')}
          </Flex>
        {/if}
        <Flex direction="row" gap="32px" fl.wr="wrap">
          <BGGLink bggId={gameData.bggId}>
            View on BoardGameGeek
            <span slot="nolink">No BGG Link available</span>
          </BGGLink>

          {#if gameData.officialURL !== ''}
            <Link href={gameData.officialURL} target="_blank">
              View Official Site <Icon name="external-link"></Icon>
            </Link>
          {:else}
            <span>No Official Site Available</span>
          {/if}
          {#if gameData.teachingURL !== ''}
            <Link href={gameData.teachingURL} target="_blank">
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
            {#each gameData[metadata.key] as row (row.id)}
              <Link href="#/{metadata.key}/{row.slug}" color={metaColor(gameData, metadata.key, row)}>{row.name}</Link>
            {/each}
          </Flex>
        {/each}
      </Grid>

      {#if $user.household !== undefined}
        <Flex direction="row" gap="32px" fl.wr="wrap">
          {#if gameData.owned !== undefined}
            <Button fill color="@primary" on:click={collection(false, gameData.slug, gameData.primaryName, gameData.publisher[0].slug)}>
              <Icon name="star-off"></Icon>
              Remove from Collection
            </Button>
          {:else}
            <Button fill color="@primary" on:click={collection(true, gameData.slug, gameData.primaryName, gameData.publisher[0].slug)}>
              <Icon name="star-filled"></Icon>
              Add to Collection
            </Button>

            {#if gameData.wishlist !== undefined}
              <Button fill color="@primary" on:click={wishlist(false, gameData.slug, gameData.primaryName)}>
                <Icon name="heart-off"></Icon>
                Remove from Wishlist
              </Button>
            {:else}
              <Button fill color="@primary" on:click={wishlist(true, gameData.slug, gameData.primaryName)}>
                <Icon name="heart-filled"></Icon>
                Add to Wishlist
              </Button>
            {/if}
          {/if}
        </Flex>
      {/if}

      <Flex direction="row" gap="32px" fl.wr="wrap">
        <Button fill color="@secondary" disabled on:click={() => push('/')}>
          <Icon name="plus"></Icon>
          Log a Session
        </Button>

        <Button fill color="@secondary" disabled={!gameData.hasSessions} on:click={sessionList}>
          <Icon name="report-analytics"></Icon>
          {#if gameData.hasSessions}
            View Session Reports
          {:else}
            No logged sessions
          {/if}
        </Button>
      </Flex>


      <Text p="8px" b.t="1.5px solid gray" b.b="1.5px solid gray">
        {@html gameData.description}
      </Text>

      {#if gameData.expansionGames.length > 0}
        <Grid cols="max-content auto" gap="8px">
          <Flex>Expansions:</Flex>
          <Flex direction="row" gap="4px" fl.wr="wrap">
            {#each gameData.expansionGames as row (row.id)}
              {#if row.id !== null}
                <Link href="#/game/{row.slug}">{row.name}</Link>
              {:else}
                <BGGLink bggId={row.bggId}>{row.name}</BGGLink>
              {/if}
            {/each}
          </Flex>
        </Grid>
      {/if}

      {#if gameData.baseGames.length > 0}
        <Grid cols="max-content auto" gap="8px">
          <Flex>Expands:</Flex>
          <Flex direction="row" gap="4px" fl.wr="wrap">
            {#each gameData.baseGames as row (row.id)}
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

  <svelte:fragment slot="error" let:error>
    {error}
  </svelte:fragment>
</LoadZone>


<style>
  h3 {
    text-transform: capitalize;
  }
</style>