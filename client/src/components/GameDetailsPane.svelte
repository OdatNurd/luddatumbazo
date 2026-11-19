<script>
  import { api } from '$api';
  import { user } from '$stores/user';
  import { wishlists } from '$stores/wishlists';

  import { DateTime } from 'luxon';

  import RecordAddDialog from '$components/dialogs/RecordAddDialog.svelte';
  import GameEditDialog from '$components/dialogs/GameEditDialog.svelte';
  import StorageAssignDialog from '$components/dialogs/StorageAssignDialog.svelte';
  import SessionAddDialog from '$components/dialogs/SessionAddDialog.svelte';
  import Confirm from '$components/Confirm.svelte';

  import LoadZone from '$components/LoadZone.svelte';
  import Icon from '$components/Icon.svelte';
  import IconButton from '$components/IconButton.svelte';
  import AsyncIconButton from '$components/AsyncIconButton.svelte';
  import BGGLink from '$components/links/BGGLink.svelte';
  import WishlistLink from '$components/links/WishlistLink.svelte';
  import PageHead from '$components/PageHead.svelte';
  import Panel from '$components/Panel.svelte';
  import SummaryGrid from '$components/SummaryGrid.svelte';
  import SummaryCard from '$components/SummaryCard.svelte';
  import ExpansionList from '$components/lists/ExpansionList.svelte';
  import MetaDataList from '$components/MetaDataList.svelte';
  import FileList from '$components/lists/FileList.svelte';
  import SessionList from '$components/lists/SessionList.svelte';
  import MarkdownContent from '$components/MarkdownContent.svelte';

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

  // The storage assignment dialog state.
  let storageDialogOpen = false;

  // The state of the game add/edit dialog; edit mode is driven by the record
  // that the page has already loaded.
  let editDialogOpen = false;

  // The state of the log-a-session dialog and the starting values it opens
  // with: this game, right now as the start, and the same default title that
  // the backend would give a report that arrives without one.
  let logSessionOpen = false;
  let logSessionPreset = null;

  // Remounts this game's session list after a report is logged so the new row
  // appears without leaving the game page.
  let sessionVersion = 0;

  // Format a numeric range for the summary strip without repeating a value when
  // both ends are the same.
  const formatRange = (min, max, suffix = '') => {
    return min === max ? `${min}${suffix}` : `${min}–${max}${suffix}`;
  };

  // The game details payload currently carries one box-art pair. This helper is
  // also the seam for the future image collection: when the data supplies
  // ordered images, they are normalized alongside the box art and the Images
  // tab opens automatically. It deliberately does not inspect GameAssets.
  const normalizeImages = data => {
    if (data === undefined || data === null) {
      return [];
    }

    const name = data.primaryName ?? 'Game';

    const boxArt = (data.imagePath || data.imageFullPath) ? [{
      thumb: data.imagePath || data.imageFullPath,
      full: data.imageFullPath || data.imagePath,
      alt: `${name} box art`
    }] : [];

    const supplied = Array.isArray(data.images) ? data.images : [];
    const normalized = supplied
      .map((image, index) => {
        if (image === null || image === undefined) {
          return null;
        }

        if (typeof image === 'string') {
          return {
            thumb: image,
            full: image,
            alt: `${name} image ${index + 1}`
          };
        }

        return {
          thumb: image.thumb ?? image.thumbnail ?? image.imagePath ?? image.full ?? image.imageFullPath,
          full: image.full ?? image.imageFullPath ?? image.thumb ?? image.thumbnail ?? image.imagePath,
          alt: image.alt ?? image.caption ?? `${name} image ${index + 1}`
        };
      })
      .filter(Boolean);

    // Keep the box art first, then any attached images, and avoid showing the
    // same full-size URL twice if the future payload also includes the box art.
    const seen = [];
    return [...boxArt, ...normalized].filter(image => {
      const key = image.full ?? image.thumb;

      if (!key || seen.includes(key)) {
        return false;
      }

      seen.push(key);
      return true;
    });
  };

  // The preferred name follows the same ownership rules as the old page: the
  // owned copy, then the wishlist entry, then the primary name.
  $: titleName = gameData?.owned?.name?.name
    ?? gameData?.wishlist?.name?.name
    ?? gameData?.primaryName
    ?? 'Game Details';

  $: headTitle = gameData === undefined || gameData === null
    ? 'Game Details'
    : `${titleName} (${gameData.publishedIn})`;

  $: images = normalizeImages(gameData);

  $: summary = gameData === undefined || gameData === null ? null : {
    players: formatRange(gameData.minPlayers, gameData.maxPlayers),
    playTime: formatRange(gameData.minPlaytime, gameData.maxPlaytime, ' min'),
    age: `${gameData.minPlayerAge}+`,
    weight: Number.isFinite(Number(gameData.complexity))
      ? `${Number(gameData.complexity).toFixed(2)}/5`
      : '—'
  };

  const logSession = () => {
    logSessionPreset = {
      gameId: gameData.id,
      gameName: gameData.primaryName,
      image: gameData.imagePath,
      sessionBegin: DateTime.now().toFormat("yyyy-MM-dd'T'HH:mm"),
      title: `Play of ${gameData.primaryName}`
    };

    logSessionOpen = true;
  };

  const logSessionClosed = detail => {
    logSessionOpen = false;

    if (detail?.result !== null && detail?.result !== undefined) {
      sessionVersion += 1;
    }
  };

  // Fetch the game details; if the current user has a primary household, then
  // this should also fetch ownership information based on that.
  const loadData = async () => {
    gameData = await api.game.details($user, slug);
  }

  // The load zone watches a stored promise so a failed request can be retried
  // in place instead of only by reloading the page.
  let detailsSource = loadData();
  const reloadDetails = () => detailsSource = loadData();

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
  // closed; the details will be either null if the operation was cancelled, or
  // the new ownership record.
  const addDialogResult = detail => {
    // Pull the dialog result out of the close details
    const { result, dataType } = detail;

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

  // Apply the updated ownership record returned by the storage dialog.
  const storageDialogResult = detail => {
    storageDialogOpen = false;

    if (detail?.result !== null && detail?.result !== undefined) {
      gameData.owned = detail.result;
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


<PageHead backTo="#/games" stackActionsOnNarrow>
  <svelte:fragment slot="eyebrow">Game Details</svelte:fragment>

  <svelte:fragment slot="title">{headTitle}</svelte:fragment>

  <svelte:fragment slot="badges">
    {#if gameData !== undefined && gameData !== null}
      {#if gameData.owned !== undefined}
        <wa-badge variant="warning">
          <Icon name="star-fill" padRight="4px"></Icon>Owned
        </wa-badge>
      {/if}

      {#if gameData.wishlist !== undefined}
        <wa-badge variant="danger">
          <Icon name="heart-fill" padRight="4px"></Icon>Wishlisted
        </wa-badge>
      {/if}

      {#if gameData.owned !== undefined}
        {#if gameData.owned.storage !== null && gameData.owned.storage !== undefined}
          <wa-badge variant={gameData.owned.isOnShelf ? 'success' : 'warning'}>
            {gameData.owned.isOnShelf ? 'On shelf' : 'Off shelf'}
          </wa-badge>
        {:else}
          <wa-badge>Unstored</wa-badge>
        {/if}
      {/if}
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="description">
    {#if gameData !== undefined && gameData !== null && gameData.owned !== undefined}
      Your copy published by
      <a href={`#/publisher/${gameData.owned.publisher.slug}`}
         title="View this publisher">{gameData.owned.publisher.name}</a>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="actions">
    {#if gameData !== undefined && gameData !== null}
      {#if $user.household}
        <IconButton variant="brand" appearance="filled" title="Edit this game"
                    caption="" label="Edit game" icon="pencil-fill"
                    onclick={() => editDialogOpen = true} />
      {/if}

      <IconButton variant="brand" appearance="filled" icon="plus"
                  caption="Log Session" title="Log a session of this game"
                  onclick={logSession} />

      {#if $user.household}
        {#if gameData.owned !== undefined}
          <AsyncIconButton variant="brand" appearance="filled"
                           caption="Remove from Collection"
                           icon="star"
                           handler={async () => removeFromCollection(gameData.slug)} />

        {:else}
          <IconButton variant="brand" appearance="filled"
                      caption="Add to Collection"
                      icon="star-fill"
                      onclick={() => addDialog = collectionProps()} />

          {#if gameData.wishlist !== undefined}
            <AsyncIconButton variant="neutral" appearance="filled"
                             caption="Remove from Wishlist"
                             icon="heart-slash"
                             handler={async () => removeFromWishlist(gameData.slug)} />

          {:else}
            <IconButton variant="neutral" appearance="filled"
                        caption="Add to Wishlist"
                        icon="heart-fill"
                        onclick={() => addDialog = wishlistProps()} />
          {/if}
        {/if}
      {/if}
    {/if}
  </svelte:fragment>
</PageHead>

<Confirm bind:this={confirmModal} />

{#if addDialog !== null}
  <RecordAddDialog open {...addDialog} onclose={addDialogResult} />
{/if}

<LoadZone source={detailsSource} onretry={reloadDetails}>
  {#if gameData !== undefined && gameData !== null}
    <div class="stack">
      <SummaryGrid spaced={false}>
        <SummaryCard label="Players" value={summary.players} />
        <SummaryCard label="Play Time" value={summary.playTime} />
        <SummaryCard label="Age" value={summary.age} />
        <SummaryCard label="Weight" value={summary.weight} />
      </SummaryGrid>

      {#if gameData.names.length > 1 || gameData.wishlist !== undefined || gameData.owned !== undefined}
        <div class="detail-rows">
          {#if gameData.wishlist !== undefined}
            <div class="detail-row wishlist-row">
              <Icon name="heart-fill" />
              <span>Added to Wishlist <WishlistLink wishlist={gameData.wishlist.wishlist} /></span>
              <span>by <strong>{gameData.wishlist.wishlister.name}</strong></span>
            </div>
          {/if}

          {#if gameData.names.length > 1}
            <div class="detail-row">
              <strong>Also known as:</strong>
              <span>{gameData.names.map(el => el.name).join(', ')}</span>
            </div>
          {/if}

          {#if gameData.owned !== undefined}
            <div class="detail-row">
              <strong>Storage:</strong>
              {#if gameData.owned.storage !== null && gameData.owned.storage !== undefined}
                <a class="storage-path" href={`#/storage/${gameData.owned.storage.slug ?? gameData.owned.storage.id}`}
                   title="View the games stored in this location">{gameData.owned.storage.path}</a>
                <wa-badge variant={gameData.owned.isOnShelf ? 'success' : 'warning'}>
                  {gameData.owned.isOnShelf ? 'On shelf' : 'Off shelf'}
                </wa-badge>
              {:else}
                <wa-badge>Unstored</wa-badge>
              {/if}

              <!-- wa-button wraps a real <button>; the a11y warnings are false positives. -->
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <wa-button appearance="outlined" size="s"
                         on:click={() => storageDialogOpen = true}>
                {gameData.owned.storage ? 'Change storage' : 'Assign storage'}
              </wa-button>
            </div>
          {/if}
        </div>
      {/if}

      <Panel title="About">
        <div class="about-grid">
          <div class="about-media">
            {#if images.length > 0}
              <wa-lightbox label={`${gameData.primaryName} box art`}
                           without-counter without-navigation>
                <wa-lightbox-item src={images[0].full} alt={images[0].alt}>
                  <GameImage imagePath={images[0].thumb} name={images[0].alt} />
                </wa-lightbox-item>
              </wa-lightbox>
            {:else}
              <div class="no-art">
                <Icon name="card-image" size="2rem"></Icon>
                <span>No box art</span>
              </div>
            {/if}
          </div>

          <!-- A scrollable region needs to be focusable so keyboard users can
               scroll it; the a11y rule treats region as noninteractive. -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="about-description" role="region" aria-label="Game description" tabindex="0">
            <div class="description-content">
              <MarkdownContent content={gameData.description}
                               empty="No description available." />
            </div>
          </div>
        </div>
      </Panel>

      <div class="reference-row">
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
        <wa-tab slot="nav" panel="production">Production</wa-tab>
        <wa-tab slot="nav" panel="gameplay">Gameplay</wa-tab>
        <wa-tab slot="nav" panel="expansions">Expansions</wa-tab>
        <wa-tab slot="nav" panel="files">Files</wa-tab>
        {#if images.length > 1}
          <wa-tab slot="nav" panel="images">Images</wa-tab>
        {/if}
        <wa-tab slot="nav" panel="sessions">Sessions</wa-tab>

        <wa-tab-panel name="production">
          <Panel title="Production">
            <MetaDataList {gameData} keyList={productionMetaKeys} />
          </Panel>
        </wa-tab-panel>

        <wa-tab-panel name="gameplay">
          <Panel title="Gameplay">
            <MetaDataList {gameData} keyList={gameplayMetaKeys} />
          </Panel>
        </wa-tab-panel>

        <wa-tab-panel name="expansions">
          <div class="stack">
            <ExpansionList data={gameData.expansionGames} title="Expansions" />
            <ExpansionList data={gameData.baseGames} title="Expansion For" />
          </div>
        </wa-tab-panel>

        <wa-tab-panel name="files">
          <Panel title="Files" flush>
            <FileList loader={loadFileData} gameName={gameData.primaryName} />
          </Panel>
        </wa-tab-panel>

        {#if images.length > 1}
          <wa-tab-panel name="images">
            <Panel title="Images">
              <div class="image-gallery">
                <wa-lightbox label={`${gameData.primaryName} images`}>
                  {#each images as image (image.full)}
                    <wa-lightbox-item class="gallery-item"
                                      src={image.full}
                                      alt={image.alt}>
                      <img class="gallery-thumb" src={image.thumb} alt={image.alt}>
                    </wa-lightbox-item>
                  {/each}
                </wa-lightbox>
              </div>
            </Panel>
          </wa-tab-panel>
        {/if}

        <wa-tab-panel name="sessions">
          <Panel title="Sessions" flush>
            {#key sessionVersion}
              <SessionList loader={loadSessionData} pageSize={5} showGames={false} />
            {/key}
          </Panel>
        </wa-tab-panel>
      </wa-tab-group>
    </div>

    <GameEditDialog open={editDialogOpen} game={gameData}
                    onclose={() => editDialogOpen = false} />

    {#if storageDialogOpen}
      <StorageAssignDialog open={true} game={gameData.slug}
                           current={gameData.owned}
                           onclose={storageDialogResult} />
    {/if}

    {#if logSessionOpen}
      <SessionAddDialog open={true} preset={logSessionPreset}
                        onclose={logSessionClosed} />
    {/if}
  {/if}
</LoadZone>


<!-- *********************************************************************** -->


<style>
  .detail-rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detail-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;
  }

  .detail-row > span {
    overflow-wrap: anywhere;
  }

  /* The wishlist row is a household relationship rather than game data, and it
     sat directly above the alias list where it read as one more line of names.
     The tinted, heart-marked treatment keeps it visually separate. */
  .detail-row.wishlist-row {
    align-self: flex-start;
    padding: 6px 12px;
    border: 1px solid var(--wa-color-danger-border-normal);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-danger-fill-quiet);
    color: var(--wa-color-danger-on-quiet);
    line-height: 1.4;
  }

  .wishlist-row :global(wa-icon) {
    color: var(--wa-color-danger-fill-loud);
  }

  .wishlist-row :global(a) {
    color: inherit;
    font-weight: var(--wa-font-weight-semibold);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .wishlist-row :global(a:hover),
  .wishlist-row :global(a:focus-visible) {
    text-decoration-thickness: 2px;
  }

  .storage-path {
    color: var(--wa-color-text-normal);
    font-weight: var(--wa-font-weight-semibold);
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  .storage-path:hover,
  .storage-path:focus-visible {
    text-decoration: underline;
  }

  .about-grid {
    --about-height: 350px;
    display: grid;
    grid-template-columns: minmax(220px, 350px) minmax(0, 1fr);
    align-items: start;
    gap: 16px;
  }

  .about-media {
    display: flex;
    align-items: center;
    justify-content: center;
    height: var(--about-height);
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-lowered);
  }

  /* Keep the lightbox host out of the flex layout so the resting image is the
     only thing the frame lays out. */
  .about-media wa-lightbox {
    display: contents;
  }

  .about-media :global(img) {
    display: block;
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: calc(var(--about-height) - 2px);
    object-fit: contain;
    border-radius: var(--wa-border-radius-s);
  }

  .no-art {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
  }

  .about-description {
    min-width: 0;
    height: var(--about-height);
    overflow-x: hidden;
    overflow-y: auto;
  }

  /* The scroll container fills the grid column so its scrollbar sits at the
     panel edge; the readable measure stays on the text itself. */
  .description-content {
    max-width: 80ch;
  }

  .about-description :global(p:first-child) {
    margin-top: 0;
  }

  .about-description :global(p:last-child) {
    margin-bottom: 0;
  }

  .about-description:focus-visible {
    outline: 2px solid var(--wa-color-brand-border-loud);
    outline-offset: 2px;
  }

  .reference-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .image-gallery {
    --gallery-thumb: 160px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .image-gallery wa-lightbox {
    display: contents;
  }

  .gallery-item {
    width: var(--gallery-thumb);
  }

  .gallery-thumb {
    display: block;
    box-sizing: border-box;
    width: 100%;
    height: var(--gallery-thumb);
    padding: 6px;
    object-fit: contain;
    border: 1px solid var(--wa-color-surface-border);
    border-radius: var(--wa-border-radius-m);
    background: var(--wa-color-surface-lowered);
  }

  .gallery-thumb:hover {
    border-color: var(--wa-color-brand-border-loud);
  }

  wa-tab-panel {
    padding-top: 6px;
  }

  /* Web Awesome's tab panel adds 32px of vertical padding around the slot. */
  wa-tab-panel::part(base) {
    padding: 0;
  }

  @media (max-width: 1023px) {
    .about-grid {
      --about-height: 300px;
      grid-template-columns: minmax(200px, 260px) minmax(0, 1fr);
    }
  }

  @media (max-width: 720px) {
    .about-grid {
      --about-height: auto;
      grid-template-columns: minmax(0, 1fr);
    }

    .about-media {
      height: auto;
      max-height: 280px;
    }

    .about-media :global(img) {
      max-height: 278px;
    }

    .about-description {
      height: auto;
      max-height: none;
      overflow: visible;
    }

    .image-gallery {
      --gallery-thumb: 145px;
    }
  }
</style>
