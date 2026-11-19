<script>
  import { onMount } from 'svelte';

  import { fetchVersion } from '$api';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The build id that was inlined into this client bundle at build time. The
  // worker returns its own build id from the version endpoint; if they differ,
  // this browser is running code from an older deployment.
  const currentBuild = `${process.env.BUILD_ID ?? ''}`;

  // Check periodically so a long-lived installed app notices a deployment.
  // Visibility and focus checks cover the common "reopen the app" case without
  // waiting for the next interval.
  const CHECK_INTERVAL = 5 * 60 * 1000;
  const CHECK_TIMEOUT = 5 * 1000;

  let updateAvailable = false;
  let checking = false;

  const check = async () => {
    if (checking || updateAvailable || currentBuild === '') {
      return;
    }

    checking = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT);

    try {
      const build = await fetchVersion({ signal: controller.signal });

      if (build !== null &&
          typeof build.buildId === 'string' &&
          build.buildId !== currentBuild) {
        updateAvailable = true;
      }
    }
    catch {
      // Version checks are best effort. Being offline, a transient failure, or
      // a request that exceeds the timeout must not interrupt the app or
      // produce a misleading update notice.
    }
    finally {
      clearTimeout(timeout);
      checking = false;
    }
  };

  const reload = () => window.location.reload();

  onMount(() => {
    check();

    const interval = setInterval(check, CHECK_INTERVAL);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        check();
      }
    };

    const onPageShow = event => {
      // A bfcache restore can return to a stale app without a network load or a
      // focus event; only the persisted pageshow needs this extra check.
      if (event.persisted) {
        check();
      }
    };

    const onOnline = () => check();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onOnline);
    };
  });
</script>


<div class="version-update" class:visible={updateAvailable} aria-live="polite">
  {#if updateAvailable}
    <!-- wa-button wraps a real <button>; the a11y warnings are false positives. -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <wa-button
      variant="brand"
      appearance="filled"
      size="s"
      title="Reload to use the latest version"
      on:click={reload}
    >
      A new version is available
    </wa-button>
  {/if}
</div>


<style>
  /* When there is no update, the wrapper must not take part in the navigation
     footer's flex gap; an empty flex item would push the version text toward
     the bottom of the bar. */
  .version-update {
    display: none;
    width: 100%;
  }

  .version-update.visible {
    display: flex;
  }

  .version-update :global(wa-button) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  /* The stock button is a fixed-height single line. In the narrow navigation
     footer, let the label wrap instead of widening the menu column. */
  .version-update :global(wa-button)::part(base) {
    height: auto;
    min-height: var(--wa-form-control-height);
    padding-block: 4px;
    white-space: normal;
  }
</style>
