<script>
  import { route, matchRoute, initStack } from '$lib/router.js';

  import { user } from '$stores/user';
  import { server } from '$stores/server';
  import { wishlists } from '$stores/wishlists';

  import LoadZone from '$components/LoadZone.svelte';
  import Icon from '$components/Icon.svelte';
  import NavDrawer from '$components/drawers/NavDrawer.svelte';
  import ProfileDrawer from '$components/drawers/ProfileDrawer.svelte';
  import GitCommitLink from '$components/links/GitCommitLink.svelte';
  import GlobalSearch from '$components/GlobalSearch.svelte';

  import Home from '$pages/Home.svelte';
  import GameList from '$pages/games/List.svelte';
  import GameDetails from '$pages/games/Details.svelte';

  import OwnedGameList from '$pages/games/OwnedList.svelte';
  import WishlistedGameList from '$pages/games/Wishlist.svelte';

  import SessionList from '$pages/sessions/List.svelte';
  import SessionDetails from '$pages/sessions/Details.svelte';

  import MetaList from '$pages/metadata/List.svelte';
  import MetaDetails from '$pages/metadata/Details.svelte';

  // The route table; the first pattern that matches the current hash path
  // decides the component to render and the props to hand it.
  const routes = [
    { path: '/',                  component: Home,        props: {} },

    { path: '/games',             component: GameList,    props: {} },
    { path: '/game/:slug',        component: GameDetails, props: {} },

    { path: '/games/owned',       component: OwnedGameList,      props: {} },
    { path: '/games/wishlisted',  component: WishlistedGameList, props: {} },
    { path: '/games/wishlisted/:wishlist', component: WishlistedGameList, props: {} },

    { path: '/sessions',          component: SessionList,    props: {} },
    { path: '/session/:id',       component: SessionDetails, props: {} },

    { path: '/categories',  component: MetaList,    props: { metaType: 'category'  } },
    { path: '/mechanics',   component: MetaList,    props: { metaType: 'mechanic'  } },
    { path: '/designers',   component: MetaList,    props: { metaType: 'designer'  } },
    { path: '/artists',     component: MetaList,    props: { metaType: 'artist'    } },
    { path: '/publishers',  component: MetaList,    props: { metaType: 'publisher' } },

    { path: '/category/:slug',  component: MetaDetails, props: { metaType: 'category'  } },
    { path: '/mechanic/:slug',  component: MetaDetails, props: { metaType: 'mechanic'  } },
    { path: '/designer/:slug',  component: MetaDetails, props: { metaType: 'designer'  } },
    { path: '/artist/:slug',    component: MetaDetails, props: { metaType: 'artist'    } },
    { path: '/publisher/:slug', component: MetaDetails, props: { metaType: 'publisher' } },
  ];

  // Match the current route against the table; pages receive the same routeInfo
  // shape they always have ({ path, params, query }).
  const match = current => {
    for (const entry of routes) {
      const params = matchRoute(entry.path, current.path);
      if (params !== null) {
        return {
          component: entry.component,
          props: entry.props,
          routeInfo: { ...current, params }
        };
      }
    }

    return null;
  };

  $: matched = match($route);

  // Initialize all of the stores that start with data from a default query.
  const ready = (async () => {
    // Get information on the current user and the server
    await Promise.all([user.init(), server.init()]);

    // Start recording navigations now that we know who is signed in; the
    // stack adopts or discards any trail a previous session left behind based
    // on whether it was this same person (see $lib/router.js).
    initStack($user.id);

    // Using the loaded data for the user, if they have a household also load
    // the list of wishlists.
    if ($user.household) {
      await wishlists.init($user.household);
    }
  })();

  // The page shell; used to collapse the mobile navigation drawer whenever the
  // route changes underneath it.
  let page = null;

  // The shell's main content area is the app's own scroll container (see
  // app.css), so navigating has to bring it back to the top by hand.
  const resetScroll = () => {
    const main = page?.shadowRoot?.querySelector('[part~="main"]');

    if (main !== null && main !== undefined) {
      main.scrollTop = 0;
    }
  };

  $: if ($route && page !== null) {
    page.hideNavigation();
    resetScroll();
  }

  // The account drawer's visibility.
  let profileOpen = false;

  // The mobile search dialog's visibility and its contents; the same combobox
  // serves both the desktop header (inline) and this dialog.
  let searchOpen = false;
  let searchDialog = null;

  // Drop the keyboard focus into the search box once the dialog has finished
  // animating open.
  const focusSearch = () => searchDialog?.querySelector('wa-combobox')?.focus();

  // Gather the commit and version used to do the build
  const version = process.env.APP_VERSION;
  const commit = process.env.COMMIT_HASH;
</script>


<wa-page bind:this={page}>
  <header slot="header">
    <div class="app-title">
      <h1>Luddatumbazo!</h1>
      <div class="page-subtitle">
        <span>Current User: {$user.displayName ?? 'Unknown'}</span>
        {#if $user.household !== null && $user.household !== undefined}
          <span>Household: {$user.household?.name ?? 'Unknown'}</span>
        {/if}
      </div>
    </div>

    <!-- The global search sits inline in the header on wide screens; narrow
         screens swap it for the icon button below, which opens the same search
         in a dialog instead. -->
    <div class="header-search">
      <GlobalSearch />
    </div>

    <div class="header-actions">
      <!-- wa-button wraps a real <button>; the a11y warnings are false positives. -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button class="search-open" appearance="plain" title="Search" on:click={() => searchOpen = true}>
        <Icon name="search" />
      </wa-button>

      <!-- The profile button carries the profile picture itself; the avatar
           falls back to a person icon when there is no picture to show. -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="outlined" on:click={() => profileOpen = true}>
        <wa-avatar
          slot="start"
          image={$user.picture}
          label={$user.displayName ?? 'Profile'}
          shape="circle"
          style="--size: 24px"
        >
          <Icon name="person-fill" />
        </wa-avatar>
        <span class="profile-label">Profile</span>
      </wa-button>
    </div>
  </header>

  <span slot="navigation-header">
    <strong>Main Menu</strong>
  </span>

  <nav slot="navigation">
    <NavDrawer close={() => page?.hideNavigation()} />
  </nav>

  <span slot="navigation-footer">
    <GitCommitLink {commit} {version} />
  </span>

  <LoadZone source={ready}>
    {#if matched !== null}
      {#key $route.path}
        <svelte:component this={matched.component} {...matched.props} routeInfo={matched.routeInfo} />
      {/key}
    {:else}
      <h3>Page not found</h3>
    {/if}

    <svelte:fragment slot="error" let:error>
      {error}
    </svelte:fragment>
  </LoadZone>

  <!-- The page level `footer` slot: a full width bar under the whole body
       (not a part of the content column), matching the header's chrome. -->
  <footer slot="footer">Exactly like BoardGameGeek except not.</footer>
</wa-page>


<wa-drawer open={profileOpen} placement="end" label="Profile" on:wa-hide={() => profileOpen = false}>
  <!-- The identity block sits at the top of the drawer body; wa-drawer has no
       `header` slot (only label / header-actions / default / footer), so a
       slot="header" element is orphaned and never renders at all. -->
  <div class="account-header">
    <wa-avatar
      image={$user.picture}
      label={$user.displayName ?? 'Profile'}
      shape="circle"
      style="--size: 64px"
    >
      <Icon name="person-fill" />
    </wa-avatar>

    <div class="account-id">
      <strong>{$user.displayName ?? 'Unknown User'}</strong>
      <div class="muted">
        {#if $user.username}<span>@{$user.username}</span>{/if}
        {#if $user.username && $user.emailAddress}<span>&bull;</span>{/if}
        {#if $user.emailAddress}<span>{$user.emailAddress}</span>{/if}
      </div>
      <!-- Explicit household line: the page header drops its subtitle on small
           screens, so the drawer always states the current household. -->
      <div class="muted">Household: {$user.household?.name ?? 'None'}</div>
    </div>
  </div>

  <ProfileDrawer close={() => profileOpen = false} />
</wa-drawer>


<!-- The mobile global search: the same combobox as the header, in a dialog
     that gets out of the way as soon as a result is picked. -->
<wa-dialog
  bind:this={searchDialog}
  open={searchOpen}
  label="Search"
  on:wa-hide={() => searchOpen = false}
  on:wa-after-show={focusSearch}
>
  <GlobalSearch close={() => searchOpen = false} />
</wa-dialog>


<style>
  /* The header is one row at every width: the title shrinks and truncates, the
     search box takes the middle on wide screens (replaced by the search icon
     on narrow ones), and the actions stay at the end. Keeping it to one row is
     what stops the phone layout from breaking into three lines (menu button /
     title / account button). */
  header {
    /* A zero flex basis keeps the menu toggle on the same line: the page
       header wraps its children before shrinking them, so a basis sized to
       the content would push the toggle onto its own row on phones. */
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: nowrap;
  }

  .app-title {
    flex: 1 1 auto;
    min-width: 0;
  }

  h1 {
    margin-bottom: 0;
    font-size: clamp(1.15rem, 4vw, 2rem);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-search {
    flex: 1 1 260px;
    max-width: 420px;
    min-width: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-inline-start: auto;
  }

  /* The inline search only fits comfortably on wider screens; below this the
     icon button opens the same search in a dialog instead. */
  .search-open {
    display: none;
  }

  @media (max-width: 640px) {
    .header-search {
      display: none;
    }

    .search-open {
      display: inline-flex;
    }

    .page-subtitle {
      display: none;
    }
  }

  /* On truly narrow screens the profile button collapses to just its avatar
     (the picture the user asked for), so the title never gets squeezed out of
     the row entirely. */
  @media (max-width: 380px) {
    .profile-label {
      display: none;
    }
  }

  /* The account drawer's profile header; the larger avatar plus the identity
     of the person it belongs to. The padding matches the drawer's link rows so
     the avatar lines up with their icons. */
  .account-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
  }

  .account-id .muted {
    display: flex;
    gap: 6px;
    font-size: var(--wa-font-size-s);
    color: var(--wa-color-text-secondary);
  }

  /* The slotted footer inherits wa-page's roomy 3xl padding by default; the
     footer is just one line of text, so it gets a slim bar's padding instead
     (roughly a quarter of the stock height). */
  footer {
    color: var(--wa-color-text-secondary);
    font-size: var(--wa-font-size-s);
    padding: 6px var(--wa-space-3xl);
    align-items: center;
  }
</style>
