<script>
  import Icon from '$components/Icon.svelte';

  import { route } from '$lib/router.js';
  import { user } from '$stores/user';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The function that can be invoked to close the menu that contains us.
  export let close = () => {};

  // The list of navigation links. This is an array of objects that have "label"
  // and "value" arguments that specify where the navigation links should go,
  // and what text to display.
  //
  // An optional "icon" names a bootstrap icon glyph to lead with.
  //
  // A link may set `exclude` to a list of route prefixes that it must not
  // claim, even though they live under its own value. Wishlists uses this: it
  // is a separate destination owned by the profile drawer, so the main menu's
  // Games item must not mark it current.
  //
  // A label that is three dashes is output as a separator.
  export let links;

  // ---------------------------------------------------------------------------

  // Check if a link should be disabled; disable any link that requires a
  // household if the given user does not have one.
  //
  // The user is passed in from the template rather than read from the store
  // here, so that every use of this helper is a real dependency on the store
  // and re-renders when the user data arrives.
  const disabled = (link, current) => link.requiresHousehold === true ? !(current.household) : false;

  // Follow a link: run its action (if any) before the browser moves on. The
  // logout link uses this to clear the app's navigation trail on the way out.
  const follow = link => {
    link.action?.();
    close();
  };

  // Normalize a link target to the same shape as a router path: no leading
  // hash, a leading slash, and no trailing slash.
  const pathOf = value => {
    let path = String(value ?? '').replace(/^#/, '');

    if (path.startsWith('/') === false) {
      path = `/${path}`;
    }

    return path.length > 1 ? path.replace(/\/+$/, '') : '/';
  };

  // Detail routes whose list page does not sit under their path. Everything
  // else (`/storage/...`, `/games/wishlisted/...`) nests under its list and is
  // resolved by the prefix rule below.
  const detailAliases = {
    game:      '/games',
    session:   '/sessions',
    category:  '/categories',
    mechanic:  '/mechanics',
    designer:  '/designers',
    artist:    '/artists',
    publisher: '/publishers'
  };

  const targetPath = path => {
    const [first] = String(path ?? '/').split('/').filter(segment => segment !== '');
    return detailAliases[first] ?? pathOf(path);
  };

  // Whether a link has opted out of claiming this target, either exactly or
  // anywhere below one of its excluded prefixes.
  const excluded = (link, target) => (link.exclude ?? []).some(prefix => {
    const path = pathOf(prefix);
    return target === path || target.startsWith(`${path}/`);
  });

  // Pick the single link that represents the current page: an exact match
  // first, then the longest prefix on a path boundary.
  //
  // This is what keeps Collection (not Games) current on `/games/owned` and
  // Wishlists current on `/games/wishlisted/<slug>`; the Games link excludes
  // the latter so the two drawers cannot disagree about which page is current.
  // Disabled links never claim the page.
  const currentLink = (list, path, current) => {
    const target = targetPath(path);
    const usable = list.filter(link =>
      link.label !== '---' && disabled(link, current) === false);

    const exact = usable.find(link =>
      pathOf(link.value) === target && excluded(link, target) === false);
    if (exact !== undefined) {
      return exact;
    }

    return usable.reduce((best, link) => {
      const linkPath = pathOf(link.value);

      if (excluded(link, target) === true || target.startsWith(`${linkPath}/`) === false) {
        return best;
      }

      return (best === null || linkPath.length > pathOf(best.value).length) ? link : best;
    }, null);
  };

  $: current = currentLink(links, $route.path, $user);
</script>

<div class="drawer-links">
  {#each links as link (link)}
    {#if link.label === '---'}
      <hr class="nav-separator" />
    {:else if disabled(link, $user)}
      <span class="nav-link nav-link-disabled">
        {#if link.icon}<Icon name={link.icon} padRight="8px"></Icon>{/if}
        {link.label}
      </span>
    {:else}
      <a class="nav-link" href={link.value} on:click={() => follow(link)}
         aria-current={link === current ? 'page' : undefined}>
        {#if link.icon}<Icon name={link.icon} padRight="8px"></Icon>{/if}
        {link.label}
      </a>
    {/if}
  {/each}
</div>

<style>
  /* Both the desktop navigation slot and the profile drawer use this list, so
   * the shared gap here is what keeps their vertical rhythm identical. */
  .drawer-links {
    display: flex;
    flex-direction: column;
    gap: var(--app-drawer-gap);
  }

  .nav-link {
    display: flex;
    align-items: center;
    padding: var(--app-drawer-link-padding);
    border-radius: var(--wa-border-radius-m);
    color: var(--wa-color-text-normal);
    text-decoration: none;
    transition: background var(--wa-transition-normal);
  }

  .nav-link:hover {
    background: var(--wa-color-overlay-inline);
    text-decoration: none;
  }

  /* The current page reads as a selected option, not as a hovered row, so it
   * is still obvious on a touch device where no pointer is over the menu. */
  .nav-link[aria-current="page"] {
    background: var(--wa-color-brand-fill-quiet);
    color: var(--wa-color-text-normal);
    font-weight: var(--wa-font-weight-semibold);
  }

  .nav-link:focus-visible {
    outline: 2px solid var(--wa-color-brand-border-loud);
    outline-offset: 2px;
  }

  .nav-link-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* The rule is mixed from the current text color rather than taken from the
   * theme's surface border token: on the drawer's raised surface that token is
   * the same colour as the background in the dark scheme, which made the
   * separators vanish there. Mixing with currentColor keeps the hairline at a
   * constant contrast against whatever surface it sits on, in both schemes. */
  .nav-separator {
    width: 64px;
    margin: var(--app-drawer-separator-margin);
    border: none;
    border-top: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  }
</style>
