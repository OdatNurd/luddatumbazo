<script>
  import { route, matchRoute } from '$lib/router.js';
  import { theme } from '$stores/theme';

  import { user } from '$stores/user';
  import { server } from '$stores/server';
  import { wishlists } from '$stores/wishlists';

  import LoadZone from '$components/LoadZone.svelte';
  import Icon from '$components/Icon.svelte';
  import NavDrawer from '$components/drawers/NavDrawer.svelte';
  import ProfileDrawer from '$components/drawers/ProfileDrawer.svelte';
  import GitCommitLink from '$components/links/GitCommitLink.svelte';

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

  // Gather the commit and version used to do the build
  const version = process.env.APP_VERSION;
  const commit = process.env.COMMIT_HASH;
</script>


<wa-page bind:this={page}>
  <header slot="header" class="row">
    <div>
      <h1>Luddatumbazo!</h1>
      <div class="page-subtitle">
        <span>Current User: {$user.displayName ?? 'Unknown'}</span>
        {#if $user.household !== null && $user.household !== undefined}
          <span>Household: {$user.household?.name ?? 'Unknown'}</span>
        {/if}
      </div>
    </div>

    <div class="row">
      <wa-button appearance="plain" title="Toggle light/dark theme" on:click={theme.toggle}>
        <Icon name={$theme === 'dark' ? 'sun-fill' : 'moon-stars-fill'} />
      </wa-button>

      <wa-button appearance="outlined" on:click={() => profileOpen = true}>
        <Icon name="person-fill" padRight="4px"></Icon>
        Account
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


<wa-drawer open={profileOpen} placement="end" label="Account" on:wa-hide={() => profileOpen = false}>
  <div slot="header">
    <strong>
      {$user.displayName ?? 'Unknown User'}
      {#if $user.household}
        : {$user.household?.name ?? 'Unknown Household'}
      {/if}
    </strong>
  </div>

  <ProfileDrawer close={() => profileOpen = false} />
</wa-drawer>


<style>
  header {
    justify-content: space-between;
    width: 100%;
  }

  h1 {
    margin-bottom: 0;
  }

  /* The slotted footer inherits wa-page's roomy 3xl padding by default; the
     footer is just one line of text, so it gets a slim bar's padding instead
     (roughly a quarter of the stock height). */
  footer {
    color: var(--wa-color-text-secondary);
    font-size: var(--wa-font-size-small);
    padding: 6px var(--wa-space-3xl);
    align-items: center;
  }
</style>
