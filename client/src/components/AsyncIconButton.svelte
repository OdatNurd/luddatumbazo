<script>
  import Icon from '$components/Icon.svelte';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Control the style of the button that is presented.
  export let color = '@default';
  export let fill = false;
  export let outline = false;
  export let disabled = false;

  // The caption of the button and the icon to use within it
  export let caption = 'derp derp derp';
  export let icon = 'layout-wtf';

  // The handler that the button executes; the handler executes when the button
  // is clicked and the button disables itself and shows its loading state while
  // the function is running.
  export let handler = async () => null;

  // ---------------------------------------------------------------------------

  // Map the legacy color names to a Web Awesome variant; legacy fill/outline
  // control the appearance in the same way they used to.
  const variant = {
    '@primary': 'brand',
    '@secondary': 'neutral',
    '@accent': 'brand',
    '@danger': 'danger',
    '@default': 'neutral'
  }[color] ?? 'neutral';

  const appearance = fill ? 'filled' : (outline ? 'outlined' : 'plain');

  // ---------------------------------------------------------------------------

  let busy = false;

  // Run the handler, holding the button in its loading state until it settles.
  const run = async () => {
    busy = true;

    try {
      await handler();
    }
    finally {
      busy = false;
    }
  }
</script>


<!-- wa-button renders a real <button> in its shadow DOM, so it is keyboard
     accessible and interactive; the compiler cannot know that. -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<wa-button {variant} {appearance} loading={busy} disabled={disabled || busy} on:click={run}>
  <Icon name={icon} padRight="4px"></Icon>
  {caption}
</wa-button>
