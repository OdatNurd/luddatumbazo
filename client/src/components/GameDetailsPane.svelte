<script>
  import { api } from '$api';
  import { user } from '$stores/user';
  import { wishlists } from '$stores/wishlists';

  import RecordAddDialog from '$components/dialogs/RecordAddDialog.svelte';
  import Confirm from '$components/Confirm.svelte';

  import LoadZone from '$components/LoadZone.svelte';
  import Icon from '$components/Icon.svelte';
  import IconButton from '$components/IconButton.svelte';
  import AsyncIconButton from '$components/AsyncIconButton.svelte';
  import BGGLink from '$components/links/BGGLink.svelte';
  import WishlistLink from '$components/links/WishlistLink.svelte';
  import BackButton from '$components/BackButton.svelte';
  import ExpansionList from '$components/lists/ExpansionList.svelte';
  import MetaDataList from '$components/MetaDataList.svelte';
  import FileList from '$components/lists/FileList.svelte';
  import SessionList from '$components/lists/SessionList.svelte';

  import GameImage from '$components/GameImage.svelte';


  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The slug that represents our game; used in our lookup in order to know what
  // game to get details for.
  export let slug;

  // ---------------------------------------------------------------------------

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

  // The reference to the modal dialog box that we use to get the user to
  // confirm that they want to remove items from their wishlist or collection.
  let confirmModal = null;

  // Parameters used to confirm the removal of a game from a collection.
  const confirmCollectionRemoval = {
      title: "Are you Sure?",
      message: "Remove this game from your collection?"
  };

  // Parameters used to confirm the removal of a game from a wishlist.
  const confirmWishlistRemoval = {
      title: "Are you Sure?",
      message: "Remove this game from your wishlist?"
  };

  // The loaded game data for the page; populated on page load
  let gameData = undefined;

  // The properties of the add-to-collection/wishlist dialog while it should be
  // presented, or null when it is closed.
  let addDialog = null;

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

  // Load the list of files that are associated with this game, if any.
  // TODO: This is currently (and stupidly) fetching the list every time the
  // tab is focused.
  const loadSessionData = async () => {
    return await api.session.list(true, slug);
  }

  // Remove a game from the owned collection for this household.
  const removeFromCollection = async (game) => {
    // Confirm the removal with the user before we proceed.
    if ((await confirmModal.show(confirmCollectionRemoval)) === false) {
      return;
    }

    // Delete the record from the DB
    await api.household.collection.remove($user.household, game);

    // Remove any ownership record we have for this game and trigger a refresh.
    delete gameData.owned;
    gameData = gameData;
  }

  // Remove a game from the wishlist for this household.
  const removeFromWishlist = async (game) => {
    // Confirm the removal with the user before we proceed.
    if ((await confirmModal.show(confirmWishlistRemoval)) === false) {
      return;
    }

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

    // Close the dialog either way.
    addDialog = null;

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

<Confirm bind:this={confirmModal} />

{#if addDialog !== null}
  <RecordAddDialog open {...addDialog} on:close={addDialogResult} />
{/if}

<LoadZone source={loadData()}>
  <wa-card>
    <div slot="header" class="game-header">
      <div class="game-title">
        {#if gameData.owned !== undefined}
          <Icon name="star-fill" color="var(--wa-color-warning-600)"></Icon>
          {gameData.owned.name.name} ({gameData.publishedIn})
        {:else}
          {#if gameData.wishlist !== undefined}
            <Icon name="heart-fill" color="var(--wa-color-danger-600)"></Icon>
            {gameData.wishlist.name.name} ({gameData.publishedIn})
          {:else}
            <Icon name="star"></Icon>
            {gameData.primaryName} ({gameData.publishedIn})
          {/if}
        {/if}
      </div>

      <div class="stat-row">
        <div class="stat">
          <span class="stat-label">Players</span>
          <span class="stat-value">
            {#if gameData.minPlayers === gameData.maxPlayers}
              {gameData.minPlayers}
            {:else}
              {gameData.minPlayers}-{gameData.maxPlayers}
            {/if}
          </span>
        </div>

        <div class="stat">
          <span class="stat-label">Play Time</span>
          <span class="stat-value">
            {#if gameData.minPlaytime === gameData.maxPlaytime}
              {gameData.minPlaytime} min
            {:else}
              {gameData.minPlaytime}-{gameData.maxPlaytime} min
            {/if}
          </span>
        </div>

        <div class="stat">
          <span class="stat-label">Age</span>
          <span class="stat-value">{gameData.minPlayerAge}+</span>
        </div>

        <div class="stat">
          <span class="stat-label">Weight</span>
          <span class="stat-value">{gameData.complexity.toFixed(2)}/5</span>
        </div>
      </div>
    </div>

    <div class="stack">
      {#if gameData.wishlist !== undefined}
        <div class="row">
          <span>Added to Wishlist <WishlistLink wishlist={gameData.wishlist.wishlist} /></span>
          <span>by <strong>{gameData.wishlist.wishlister.name}</strong></span>
        </div>
      {/if}

      {#if gameData.names.length > 1}
        <div class="row">
          <strong>Also Known As:</strong>
          <span>{gameData.names.map(el => el.name).join(', ')}</span>
        </div>
      {/if}

      <div class="row-lg">
        {#if gameData.teachingURL !== ''}
          <a href={gameData.teachingURL} target="_blank" rel="noreferrer">
            Learn to Play <Icon padLeft="4px" name="box-arrow-up-right"></Icon>
          </a>
        {:else}
          <span class="muted"><Icon name="pencil-fill" padRight="4px"></Icon>No Learning Video available</span>
        {/if}

        {#if gameData.officialURL !== ''}
          <a href={gameData.officialURL} target="_blank" rel="noreferrer">
            View Official Site <Icon padLeft="4px" name="box-arrow-up-right"></Icon>
          </a>
        {:else}
          <span class="muted"><Icon name="pencil-fill" padRight="4px"></Icon>No Official Site Available</span>
        {/if}

        <BGGLink bggId={gameData.bggId}>
          View on BoardGameGeek
          <span slot="nolink">No BGG Link available</span>
        </BGGLink>
      </div>

      <wa-tab-group>
        <wa-tab slot="nav" panel="images">Images</wa-tab>
        <wa-tab slot="nav" panel="files">Files</wa-tab>
        <wa-tab slot="nav" panel="description">Description</wa-tab>

        <wa-tab-panel name="images">
          <div class="game-image">
            <GameImage imagePath={gameData.imagePath} name={gameData.primaryName} />
          </div>
        </wa-tab-panel>

        <wa-tab-panel name="files">
          <FileList loader={loadFileData} gameName={gameData.primaryName} />
        </wa-tab-panel>

        <wa-tab-panel name="description">
          {@html gameData.description}
        </wa-tab-panel>
      </wa-tab-group>

      <wa-tab-group>
        <wa-tab slot="nav" panel="production">Production</wa-tab>
        <wa-tab slot="nav" panel="gameplay">Gameplay</wa-tab>
        <wa-tab slot="nav" panel="expansions">Expansions</wa-tab>
        <wa-tab slot="nav" panel="sessions">Sessions</wa-tab>

        <wa-tab-panel name="production">
          <MetaDataList {gameData} keyList={productionMetaKeys} />
        </wa-tab-panel>

        <wa-tab-panel name="gameplay">
          <MetaDataList {gameData} keyList={gameplayMetaKeys} />
        </wa-tab-panel>

        <wa-tab-panel name="expansions">
          <div class="stack">
            <ExpansionList data={gameData.expansionGames} title="Expansions:" />
            <ExpansionList data={gameData.baseGames} title="Expansion For:" />
          </div>
        </wa-tab-panel>

        <wa-tab-panel name="sessions">
          <div class="stack">
            <div class="grid-auto">
              <IconButton disabled fill color="@secondary" icon="plus" caption="Log a Session" />
            </div>

            <SessionList loader={loadSessionData} pageSize={5} showGames={false} />
          </div>
        </wa-tab-panel>
      </wa-tab-group>

      {#if $user.household}
        <div class="actions">
          {#if gameData.owned !== undefined}
            <AsyncIconButton fill color="@primary"
                             caption="Remove from Collection"
                             icon="star"
                             handler={async () => removeFromCollection(gameData.slug)} />

          {:else}
            <IconButton fill color="@primary"
                        caption="Add to Collection"
                        icon="star-fill"
                        on:click={() => addDialog = collectionProps()} />

            {#if gameData.wishlist !== undefined}
              <AsyncIconButton fill color="@secondary"
                               caption="Remove from Wishlist"
                               icon="heart-slash"
                               handler={async () => removeFromWishlist(gameData.slug)} />

            {:else}
              <IconButton fill color="@secondary"
                          caption="Add to Wishlist"
                          icon="heart-fill"
                          on:click={() => addDialog = wishlistProps()} />
            {/if}
          {/if}
        </div>
      {/if}
    </div>
  </wa-card>

  <svelte:fragment slot="error" let:error>
    {error}
  </svelte:fragment>
</LoadZone>


<!-- *********************************************************************** -->


<style>
  h3 {
    text-transform: capitalize;
  }

  .game-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .game-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--wa-font-family-heading);
    font-size: var(--wa-font-size-x-large);
    color: var(--wa-color-text-header);
  }

  .stat-row {
    display: flex;
    flex-direction: row;
    gap: 24px;
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    flex-direction: column;
  }

  .stat-label {
    font-size: var(--wa-font-size-small);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--wa-color-text-secondary);
  }

  .stat-value {
    font-size: var(--wa-font-size-large);
    font-weight: var(--wa-font-weight-semibold);
    color: var(--wa-color-text-header);
  }

  .game-image {
    display: flex;
    flex-wrap: wrap;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--wa-color-surface-border);
  }
</style>
