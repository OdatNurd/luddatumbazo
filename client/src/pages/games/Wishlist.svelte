<script>
  import { onMount } from 'svelte';

  import { api } from '$api';
  import { user } from '$stores/user';
  import { wishlists } from '$stores/wishlists';
  import { navigate } from '$lib/router.js';
  import { foldText } from '$lib/text.js';

  import SlugList from '$components/lists/SlugList.svelte';
  import PageHead from '$components/PageHead.svelte';
  import EmptyState from '$components/EmptyState.svelte';
  import SummaryGrid from '$components/SummaryGrid.svelte';
  import SummaryCard from '$components/SummaryCard.svelte';
  import IconButton from '$components/IconButton.svelte';
  import Confirm from '$components/Confirm.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Receive parameters from the URL route that landed us on this page; the
  // wishlist parameter selects which list is displayed.
  export let routeInfo = {};

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  // The route carries the selected wishlist slug. The root list is reached by
  // the bare /games/wishlisted route, so an absent parameter means the root.
  $: requested = routeInfo.params?.wishlist;
  $: root = $wishlists.find(entry => entry.isRoot === true) ?? null;
  $: rootSlug = root?.slug ?? 'root';
  $: loaderKey = requested ?? rootSlug;
  $: selected = $wishlists.find(entry => entry.slug === loaderKey) ?? null;

  const loader = async wishlistSlug =>
    api.household.wishlist.contents.get($user.household, wishlistSlug);

  // The picker is a combobox rather than a plain select so that typing filters
  // the list. It is compact enough to live in the page head next to the list
  // management actions instead of taking over the page.
  let picker = null;

  const dataSource = async ({ query }) => {
    const needle = foldText((query ?? '').trim());

    return $wishlists
      .filter(entry => needle === '' || foldText(entry.name).includes(needle))
      .map(entry => {
        const element = document.createElement('wa-option');
        element.setAttribute('value', entry.slug);
        element.setAttribute('label', entry.name);
        element.textContent = entry.name;
        return element;
      });
  };

  $: if (picker !== null) {
    picker.dataSource = dataSource;
  }

  // Keep the control showing the list the route selected. The combobox keeps
  // its display text separate from its value, so both need to be set; this also
  // restores the right name after a back navigation or a rename.
  const showSelection = (control, slug, entries) => {
    if (control === null) {
      return;
    }

    const entry = entries.find(candidate => candidate.slug === slug);

    control.value = entry?.slug ?? '';
    control.inputValue = entry?.name ?? '';
  };

  $: showSelection(picker, loaderKey, $wishlists);

  // Selecting a list is a navigation rather than a local swap so that the
  // wishlist slug becomes part of the route. The grid's search, sort and page
  // live in the query, and the router records the whole route, so going into a
  // game and pressing back returns to this same list in the same view state.
  const selectWishlist = event => {
    const entry = $wishlists.find(candidate => candidate.slug === event.target.value);

    if (entry === undefined || entry.slug === loaderKey) {
      return;
    }

    navigate(entry.isRoot ? '/games/wishlisted' : `/games/wishlisted/${entry.slug}`);
  };

  // ---------------------------------------------------------------------------
  // Page state
  // ---------------------------------------------------------------------------

  // The rows behind the grid, used to summarize the selected wishlist.
  let rows = null;
  let actionError = null;

  $: count = rows === null ? '—' : rows.length;

  const loaded = result => rows = result;

  const plural = value => value === 1 ? 'game' : 'games';

  onMount(() => {
    if ($user.household) {
      wishlists.init($user.household)
        .catch(failure => actionError = failure.message ?? 'unable to load the wishlists');
    }
  });

  // ---------------------------------------------------------------------------
  // Creating, renaming and deleting lists
  // ---------------------------------------------------------------------------

  let editor = { open: false, mode: 'create', name: '' };
  let warning = null;
  let saving = false;
  let editorDialog = null;
  let focusTimer = null;

  let confirmModal = null;

  // Focus the name field after the dialog has rendered and completed its own
  // initial focus pass. This runs for both adding and renaming.
  const focusName = () => {
    clearTimeout(focusTimer);
    focusTimer = setTimeout(() => editorDialog?.querySelector('wa-input')?.focus(), 100);
  };

  const openCreate = () => {
    editor = { open: true, mode: 'create', name: '' };
    warning = null;
    actionError = null;
    focusName();
  };

  const openRename = () => {
    if (selected === null) {
      return;
    }

    editor = { open: true, mode: 'rename', name: selected.name };
    warning = null;
    actionError = null;
    focusName();
  };

  const closeEditor = () => {
    if (saving === true) {
      return;
    }

    editor = { ...editor, open: false };
    warning = null;
  };

  const dismissed = event => {
    if (event.target === event.currentTarget) {
      if (saving === true) {
        event.preventDefault();
        return;
      }

      closeEditor();
    }
  };

  const nameChanged = event => editor = { ...editor, name: event.target.value };

  const save = async () => {
    if (saving === true) {
      return;
    }

    const name = editor.name.trim();

    if (name === '') {
      warning = editor.mode === 'create'
        ? 'Enter a name for the wishlist.'
        : 'Enter a name for this wishlist.';
      return;
    }

    if (editor.mode === 'rename' && selected === null) {
      editor = { ...editor, open: false };
      return;
    }

    saving = true;
    warning = null;
    actionError = null;

    try {
      if (editor.mode === 'create') {
        const created = await api.household.wishlist.lists.add($user.household, name);
        editor = { ...editor, open: false };

        // Refresh the picker before moving to the new list. A refresh failure
        // must not turn a successful create into an error.
        await wishlists.init($user.household).catch(() => {});

        if (created?.slug) {
          navigate(`/games/wishlisted/${created.slug}`);
        }
      }
      else {
        await api.household.wishlist.lists.update($user.household, selected.slug, name);
        editor = { ...editor, open: false };

        // The slug does not change, so the route stays valid; refreshing swaps
        // the display name everywhere the store is used.
        await wishlists.init($user.household).catch(() => {});
      }
    }
    catch (failure) {
      warning = failure.message ?? 'unable to save the wishlist';
    }
    finally {
      saving = false;
    }
  };

  // Enter in the name field takes the dialog's primary action.
  const editorKeydown = event => {
    if (event.key !== 'Enter' || event.isComposing === true) {
      return;
    }

    event.preventDefault();
    save();
  };

  const deleteTitle = entry => {
    if (entry === null) {
      return undefined;
    }

    if (entry.isRoot) {
      return 'The default wishlist cannot be deleted';
    }

    if (entry.gameCount > 0) {
      return `Remove the ${entry.gameCount} ${plural(entry.gameCount)} from this wishlist first`;
    }

    return `Delete ${entry.name}`;
  };

  const removeWishlist = async entry => {
    if (entry === null || entry.isRoot || entry.gameCount > 0) {
      return;
    }

    const confirmed = await confirmModal.show({
      title: 'Delete wishlist?',
      message: `Delete "${entry.name}"? This cannot be undone.`,
      confirmLabel: 'Delete'
    });

    if (confirmed === false) {
      return;
    }

    actionError = null;

    try {
      await api.household.wishlist.lists.remove($user.household, entry.slug);
      await wishlists.init($user.household).catch(() => {});

      // Deleting the list currently in view leaves nowhere to show, so return
      // to the root list instead of reloading a route that no longer exists.
      if (entry.slug === loaderKey) {
        navigate('/games/wishlisted');
      }
    }
    catch (failure) {
      actionError = failure.message ?? 'unable to delete the wishlist';
    }
  };
</script>


{#if $user.household}
  <PageHead title="Wishlists"
            description={`Wishlists for ${$user.household?.name ?? 'Unknown'}. Create lists for gift ideas, expansions, or games to watch.`}
            hideDescriptionOnNarrow>
    <svelte:fragment slot="actions">
      <wa-combobox bind:this={picker} size="s"
                   class="wishlist-picker wa-visually-hidden-label"
                   label="Wishlist" placeholder="Find a wishlist"
                   on:change={selectWishlist}>
        <span slot="no-results">No wishlists match</span>
      </wa-combobox>

      <IconButton variant="neutral" appearance="plain" caption=""
                  icon="pencil" label="Rename wishlist"
                  title={selected === null ? undefined : `Rename ${selected.name}`}
                  disabled={selected === null} onclick={openRename} />

      <IconButton variant="neutral" appearance="plain" caption=""
                  icon="trash" label="Delete wishlist"
                  title={deleteTitle(selected)}
                  disabled={selected === null || selected.isRoot || selected.gameCount > 0}
                  onclick={() => removeWishlist(selected)} />

      <IconButton variant="brand" appearance="filled" caption=""
                  icon="plus" label="New wishlist" title="Create a wishlist"
                  onclick={openCreate} />
    </svelte:fragment>
  </PageHead>

  {#if actionError !== null}
    <wa-callout variant="warning">{actionError}</wa-callout>
  {/if}

  <SummaryGrid>
    <SummaryCard label="Games" value={count} note="in this wishlist" />
    <SummaryCard label="Wishlists" value={$wishlists.length} note="defined" />
  </SummaryGrid>

  <SlugList bggType='boardgame' baseLink='#/game/:slug' {loader} onrows={loaded}
            {loaderKey} gridKey="wishlists"
            emptyMessage={selected === null ? undefined : `No games in ${selected.name} yet.`} />

  <Confirm bind:this={confirmModal} />

  {#if editor.open}
    <wa-dialog bind:this={editorDialog} open
               label={editor.mode === 'create' ? 'New Wishlist' : 'Rename Wishlist'}
               style="min-width: min(480px, 92vw)" on:wa-hide={dismissed}>
      <h3 slot="header">{editor.mode === 'create' ? 'New Wishlist' : 'Rename Wishlist'}</h3>

      {#if warning !== null}
        <wa-callout variant="warning">{warning}</wa-callout>
      {/if}

      <div class="stack">
        <!-- wa-input wraps a real input; the custom element's keydown is the
             one Svelte cannot see into. -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <wa-input label="Name" maxlength={80} value={editor.name}
                  on:input={nameChanged} on:keydown={editorKeydown}>
        </wa-input>

        <div class="muted hint">
          {#if editor.mode === 'create'}
            The page address is generated from the name when the wishlist is saved.
          {:else}
            Renaming changes the display name only; the page address stays the same.
          {/if}
        </div>
      </div>

      <div slot="footer" class="dialog-actions">
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button appearance="outlined" variant="neutral" on:click={closeEditor}
                   disabled={saving}>Cancel</wa-button>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button appearance="filled" variant="brand" on:click={save}
                   loading={saving} disabled={saving}>
          {editor.mode === 'create' ? 'Create' : 'Rename'}
        </wa-button>
      </div>
    </wa-dialog>
  {/if}
{:else}
  <PageHead title="Wishlists" />
  <EmptyState title="No household yet"
              description="You need to belong to a household before you can view wishlists." />
{/if}


<style>
  .wishlist-picker {
    width: 240px;
    max-width: 100%;
    flex: 1 1 180px;
  }

  .hint {
    font-size: var(--wa-font-size-s);
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;
  }
</style>
