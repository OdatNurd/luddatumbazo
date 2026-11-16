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

  let updateAvailable = false;
  let checking = false;

  const check = async () => {
    if (checking || updateAvailable || currentBuild === '') {
      return;
    }

    checking = true;

    try {
      const build = await fetchVersion();

      if (build !== null &&
          typeof build.buildId === 'string' &&
          build.buildId !== currentBuild) {
        updateAvailable = true;
      }
    }
    catch {
      // Version checks are best effort. Being offline, or a transient failure,
      // must not interrupt the app or produce a misleading update notice.
    }
    finally {
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

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', check);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', check);
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
  .version-update {
    display: flex;
    width: 100%;
  }

  .version-update.visible {
    margin-bottom: 8px;
  }

  .version-update :global(wa-button) {
    width: 100%;
  }
</style>
