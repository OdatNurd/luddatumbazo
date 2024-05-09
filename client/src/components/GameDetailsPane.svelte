<script>
  import { Modal, EntryButton, LoadZone, Paper, Titlebar, Link, Text, Flex, Grid, Button, Icon } from "@axel669/zephyr";

  import { push } from 'svelte-spa-router';

  import { user } from '$stores/user';

  import RecordAddDialog from '$components/dialogs/RecordAddDialog.svelte';

  import BackButton from '$components/BackButton.svelte';
  import BGGLink from '$components/links/BGGLink.svelte';
  import GameImage from '$components/GameImage.svelte';

  import { api } from '$api';

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
    gameData = await api.game.details($user, slug);
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
      const { id, metaType } = gameData.owned.publisher;

      // Mild hack; the publisherId is here because this is expected to only
      // ever color a publisher since that is the only thing in the ownership
      // record.
      if (metaDataType === metaType && rowData.id === id) {
        return "@primary";
      }
    }

    // Fallback; use normal text color.
    return null;
  }

  // Remove a game from the owned collection for this household.
  const removeFromCollection = async (game) => {
    // Delete the record from the DB
    await api.household.collection.remove($user, game);

    // Remove any ownership record we have for this game and trigger a refresh.
    delete gameData.owned;
    gameData = gameData;
  }

  // Remove a game from the wishlist for this household.
  const removeFromWishlist = async (game) => {
    // Delete the record from the DB
    await api.household.wishlist.remove($user, game);

    // Remove any wishlist record we have for this game and trigger a refresh.
    delete gameData.wishlist;
    gameData = gameData;
  }

  // Invoked when the dialog used to add a game to a collection or wishlist is
  // closed; the details on the event will be either null if the operation was
  // cancelled, or the new ownership record.
  const addDialogResult = event => {
    // Pull the dialog result out of the close event
    const { result, dataType } = event.detail;

    // If we got a result, then update the game record with the new data.
    if (result !== null) {

      if (dataType == 'collection') {
        // Add the new ownership record and remove any existing wishlist record.
        gameData.owned = result;
        delete gameData.wishlist;
      } else {
        // Add the new wishlist record.
        gameData.wishlist = result;
      }

      // Trigger refresh.
      gameData = gameData;
    }
  }


  // Invoked to specify the dialog properties when adding to the collection
  const collectionProps = () => {
    return {
      dataType: 'collection',
      title: 'Add to Collection',
      description: 'Select owned game properties',
      game: gameData.slug,
      names: gameData.names.map(e => ({label: e.name, value: e.name })),
      publishers: gameData.publisher.map(e => ({label: e.name, value: e.slug })),
    }
  }

  // Invoked to specify the dialog properties when adding to the wishlist.
  const wishlistProps = () => {
    return {
      dataType: 'wishlist',
      title: 'Add to Wishlist',
      description: 'Select desired game name',
      game: gameData.slug,
      names: gameData.names.map(e => ({label: e.name, value: e.name })),
    }
  }
</script>


<BackButton>
  <h3>Game Details</h3>
</BackButton>

<Modal component={RecordAddDialog} />

<LoadZone source={loadData()}>
  <Paper>
    <Titlebar slot="header">
      <Flex p="0px" gap="0px" slot="title">
        <Text title>
          {#if gameData.owned !== undefined}
            <Icon name="star-fill">{gameData.owned.name} ({gameData.publishedIn})</Icon>
          {:else}
            {#if gameData.wishlist !== undefined}
              <Icon name="heart-fill">{gameData.wishlist.name} ({gameData.publishedIn}) [Added by: {gameData.wishlist.wishlister.name}]</Icon>
            {:else}
              <Icon name="star">{gameData.primaryName} ({gameData.publishedIn})</Icon>
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
              View Official Site <Icon p.l="4px" name="box-arrow-up-right"></Icon>
            </Link>
          {:else}
            <span>No Official Site Available</span>
          {/if}
          {#if gameData.teachingURL !== ''}
            <Link href={gameData.teachingURL} target="_blank">
              Learn to Play <Icon p.l="4px" name="box-arrow-up-right"></Icon>
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
            <Button fill color="@primary" on:click={removeFromCollection(gameData.slug)}>
              <Icon p.r="4px" name="star"></Icon>
              Remove from Collection
            </Button>
          {:else}

            <EntryButton fill color="@primary" this={Modal} component={RecordAddDialog} props={collectionProps} on:entry={addDialogResult}>
              <Icon p.r="4px" name="star-fill"></Icon>
              Add to Collection
            </EntryButton>

            {#if gameData.wishlist !== undefined}
              <Button fill color="@primary" on:click={removeFromWishlist(gameData.slug)}>
                <Icon p.r="4px" name="heart"></Icon>
                Remove from Wishlist
              </Button>
            {:else}
              <EntryButton fill color="@primary" this={Modal} component={RecordAddDialog} props={wishlistProps} on:entry={addDialogResult}>
                <Icon p.r="4px" name="heart-fill"></Icon>
                Add to Wishlist
              </EntryButton>
            {/if}
          {/if}
        </Flex>
      {/if}

      <Flex direction="row" gap="32px" fl.wr="wrap">
        <Button fill color="@secondary" disabled on:click={() => push('/')}>
          <Icon p.r="4px" name="plus"></Icon>
          Log a Session
        </Button>

        <Button fill color="@secondary" disabled={!gameData.hasSessions} on:click={sessionList}>
          <Icon p.r="4px" name="clipboard-data"></Icon>
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