<script>
  import BackButton from '$components/BackButton.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The page title. A `title` slot can supply richer markup; when neither is
  // present, no heading is rendered (the storage subpages use a breadcrumb as
  // their page identity).
  export let title = '';

  // Plain-text description. A `description` slot takes precedence for pages
  // that need a breadcrumb plus explanatory copy.
  export let description = undefined;

  // The fallback route for the back button when the navigation stack has no
  // recorded trail (a cold deep link, for example).
  export let backTo = undefined;

  // ---------------------------------------------------------------------------
</script>


<div class="page-head">
  {#if backTo}
    <BackButton to={backTo} />
  {/if}

  <div class="page-head-main">
    {#if $$slots.media}
      <div class="page-media">
        <slot name="media" />
      </div>
    {/if}

    <div class="page-copy">
      {#if $$slots.eyebrow}
        <div class="page-eyebrow">
          <slot name="eyebrow" />
        </div>
      {/if}

      {#if title !== '' || $$slots.title}
        <h3><slot name="title">{title}</slot></h3>
      {/if}

      {#if $$slots.badges}
        <div class="page-badges">
          <slot name="badges" />
        </div>
      {/if}

      {#if $$slots.description}
        <div class="page-description">
          <slot name="description" />
        </div>
      {:else if description !== undefined && description !== ''}
        <p class="page-description">{description}</p>
      {/if}
    </div>
  </div>

  {#if $$slots.actions}
    <div class="page-actions">
      <slot name="actions" />
    </div>
  {/if}
</div>


<style>
  .page-head {
    display: flex;
    align-items: flex-start;
    gap: var(--app-page-head-gap);
    flex-wrap: wrap;
    margin-bottom: var(--app-page-head-margin);
  }

  .page-head-main {
    display: flex;
    align-items: flex-start;
    gap: var(--app-page-head-gap);
    flex: 1 1 16rem;
    min-width: 0;
  }

  .page-media {
    flex: 0 0 auto;
    min-width: 0;
  }

  /* A named slot that is present but whose conditional content is empty still
     leaves a wrapper in the DOM. Hide those wrappers so they do not add a gap
     or reserve space when a page has no image, badge, or action at runtime. */
  .page-media:not(:has(*)),
  .page-eyebrow:not(:has(*)),
  .page-badges:not(:has(*)),
  .page-actions:not(:has(*)) {
    display: none;
  }

  .page-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;
    flex: 1 1 auto;
  }

  .page-copy h3 {
    margin: 0;
    font-size: var(--app-page-title-size);
    overflow-wrap: anywhere;
  }

  .page-eyebrow {
    min-width: 0;
    max-width: 100%;
  }

  .page-description {
    margin: 0;
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    line-height: 1.4;
    max-width: 80ch;
    overflow-wrap: anywhere;
  }

  .page-description :global(p) {
    margin: 0;
  }

  .page-description :global(.muted) {
    color: var(--wa-color-text-quiet);
  }

  .page-badges {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .page-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex: 0 0 auto;
    flex-wrap: wrap;
    margin-inline-start: auto;
  }

  @media (max-width: 720px) {
    .page-head-main {
      flex-basis: 100%;
    }

    .page-actions {
      width: 100%;
      justify-content: flex-end;
      margin-inline-start: 0;
    }
  }

  @media (max-width: 480px) {
    .page-head-main {
      gap: 12px;
    }
  }
</style>
