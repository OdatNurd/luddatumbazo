<script>
  import { Button, EntryButton, Flex, Grid, Icon, Link, LoadZone, Modal, Paper, Tabs, Text, Titlebar } from "@axel669/zephyr";

  import { push } from 'svelte-spa-router';

  import { api } from '$api';
  import { user } from '$stores/user';
  import { wishlists } from '$stores/wishlists';

  import RecordAddDialog from '$components/dialogs/RecordAddDialog.svelte';

  import BGGLink from '$components/links/BGGLink.svelte';
  import WishlistLink from '$components/links/WishlistLink.svelte';
  import BackButton from '$components/BackButton.svelte';
  import ExpansionList from '$components/lists/ExpansionList.svelte';
  import MetaDataList from '$components/MetaDataList.svelte';
  import GameAssetList from '$components/lists/FileList.svelte';

  import GameImage from '$components/GameImage.svelte';


  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The slug that represents our game; used in our lookup in order to know what
  // game to get details for.
  export let slug;

  // ---------------------------------------------------------------------------

  // The core data that is available on the game; the list of images that are
  // available, the list of attached files, and the descriptive text for the
  // game.
  const coreOptions = [
      { label: "Images",      value: "images"      },
      { label: "Files",       value: "files"       },
      { label: "Description", value: "description" },
  ];
  let coreValue = coreOptions[0].value;

  // The underlying data options; information on the production of the game, the
  // various gameplay categories and mechanics, the expansions that are
  // available and the session reports for the game (if any).
  const dataOptions = [
      { label: "Production", value: 'production' },
      { label: "Gameplay",   value: 'gameplay'   },
      { label: "Expansions", value: 'expansions' },
      { label: "Sessions",   value: 'sessions'   },
  ];
  let dataValue = dataOptions[0].value;

  // The meta keys that are related to the production tab.
  const productionMetaKeys = [
    { "key": "designer",  "title": "Designers:" },
    { "key": "artist",    "title": "Artists:" },
    { "key": "publisher", "title": "Publishers:" },
  ];

  // The meta keys that are related to the gameplay tab.
  // The list of keys that represent metadata in the returned game object, what
  // titles they should have, and what order to display them in.
  const gameplayMetaKeys = [
    { "key": "category",  "title": "Categories:" },
    { "key": "mechanic",  "title": "Mechanics:" },
  ];

  // ---------------------------------------------------------------------------


  // The loaded game data for the page; populated on page load
  let gameData = undefined;

  // Fetch the game details; if the current user has a primary household, then
  // this should also fetch ownership information based on that.
  const loadData = async () => {
    gameData = await api.game.details($user, slug);
  }

  // Load the list of files that are associated with this game, if any.
  // TODO: This is currently (and stupidly) fetching the list every time the
  // tab is focused.
  const loadFileData = async () => {
    return await api.game.assets.list(slug);
  }

  // Remove a game from the owned collection for this household.
  const removeFromCollection = async (game) => {
    // Delete the record from the DB
    await api.household.collection.remove($user.household, game);

    // Remove any ownership record we have for this game and trigger a refresh.
    delete gameData.owned;
    gameData = gameData;
  }

  // Remove a game from the wishlist for this household.
  const removeFromWishlist = async (game) => {
    // Delete the record from the DB
    await api.household.wishlist.contents.remove($user.household, game);

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
      optionLabel: 'Publisher',
      options: gameData.publisher.map(e => ({label: e.name, value: e.slug })),
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
      optionLabel: 'Wishlist',
      options: $wishlists
    }
  }
</script>


<!-- *********************************************************************** -->


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
            <Icon name="star-fill">{gameData.owned.name.name} ({gameData.publishedIn})</Icon>
          {:else}
            {#if gameData.wishlist !== undefined}
              <Icon name="heart-fill">{gameData.wishlist.name.name} ({gameData.publishedIn})</Icon>
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
      <Text subtitle>
        {#if gameData.wishlist !== undefined}
          <Flex direction="row" gap="8px">
            Added to Wishlist <WishlistLink wishlist={gameData.wishlist.wishlist} />
            by <strong>{gameData.wishlist.wishlister.name}</strong>
          </Flex>
        {/if}
        {#if gameData.names.length > 1}
          <Flex direction="row" gap="8px">
            <strong>Also Known As:</strong>
            {gameData.names.map(el => el.name).join(', ')}
          </Flex>
        {/if}
        <Flex direction="row" gap="32px" fl.wr="wrap">
          {#if gameData.teachingURL !== ''}
            <Link href={gameData.teachingURL} target="_blank">
              Learn to Play <Icon p.l="4px" name="box-arrow-up-right"></Icon>
            </Link>
          {:else}
            <Icon name="pencil-fill">No Learning Video available</Icon>
          {/if}

          {#if gameData.officialURL !== ''}
            <Link href={gameData.officialURL} target="_blank">
              View Official Site <Icon p.l="4px" name="box-arrow-up-right"></Icon>
            </Link>
          {:else}
            <Icon name="pencil-fill">No Official Site Available</Icon>
          {/if}

          <BGGLink bggId={gameData.bggId}>
            View on BoardGameGeek
            <span slot="nolink">No BGG Link available</span>
          </BGGLink>

        </Flex>
      </Text>

      <Tabs bind:value={coreValue} options={coreOptions} color="@primary" solid />
      <tab-content>
        {#if coreValue === "images"}
          <Flex fl.wr="wrap">
            <GameImage imagePath={gameData.imagePath} name={gameData.primaryName} />
          </Flex>
        {:else if coreValue === "description"}
          {@html gameData.description}
        {:else}
          <GameAssetList loader={loadFileData}/>
        {/if}
      </tab-content>

      <Tabs bind:value={dataValue} options={dataOptions} color="@secondary" solid />
      <tab-content>
        {#if dataValue === "production"}
          <MetaDataList {gameData} keyList={productionMetaKeys} />

        {:else if dataValue === "gameplay"}
          <MetaDataList {gameData} keyList={gameplayMetaKeys} />

        {:else if dataValue === "expansions"}
          <ExpansionList data={gameData.expansionGames} title="Expansions:" />
          <ExpansionList data={gameData.baseGames} title="Expansion For:" />

        {:else}
          <Grid gr.cols="repeat(auto-fit, minmax(0, 1fr))" gap="8px">
            <Button fill color="@secondary" disabled on:click={() => push('/')}>
              <Icon p.r="4px" name="plus"></Icon>
              Log a Session
            </Button>
          </Grid>
        {/if}
      </tab-content>


      {#if $user.household}
        <Grid gr.cols="1fr 1fr" gap="8px">
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
              <Button fill color="@secondary" on:click={removeFromWishlist(gameData.slug)}>
                <Icon p.r="4px" name="heart"></Icon>
                Remove from Wishlist
              </Button>
            {:else}
              <EntryButton fill color="@secondary" this={Modal} component={RecordAddDialog} props={wishlistProps} on:entry={addDialogResult}>
                <Icon p.r="4px" name="heart-fill"></Icon>
                Add to Wishlist
              </EntryButton>
            {/if}
          {/if}
        </Grid>
      {/if}


    </Flex>
  </Paper>

  <svelte:fragment slot="error" let:error>
    {error}
  </svelte:fragment>
</LoadZone>


<!-- *********************************************************************** -->


<style>
  h3 {
    text-transform: capitalize;
  }

  tab-content {
    padding-bottom: 16px;
    border-bottom: 1.5px solid gray;
  }
</style>