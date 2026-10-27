<script>
  import { createEventDispatcher } from 'svelte';

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

  // Optional tooltip presented when the button is hovered.
  export let title = undefined;

  // If specified, alter the caption and/or the icon for a period of time when
  // the button is clicked.
  export let clickedCaption = undefined;
  export let clickedIcon = undefined;

  // The amount of time, in ms, that the alternate caption and icon (if any) are
  // displayed after the button is clicked.
  export let timeout = 750;

  // ---------------------------------------------------------------------------

  // Set the caption and/or icon that is used when a click is registered to the
  // main ones, if they were not given.
  clickedCaption ||= caption;
  clickedIcon ||= icon;

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

  const dispatch = createEventDispatcher();

  // The button element; the tooltip is applied as a plain attribute because
  // assigning `title` as a property on a custom element does not reflect it,
  // and the native tooltip reads the attribute.
  let button = null;

  $: if (button !== null && title !== undefined) {
    button.setAttribute('title', title);
  }

  let btnClicked = false;
  const btnClick = () => {
    // Send out a click event to our parent.
    dispatch('click');

    // If any of the button state is supposed to be different during a click,
    // set the flag and reset it after the given timeout to make the display
    // change.
    if (caption !== clickedCaption || icon !== clickedIcon) {
      btnClicked = true;
      setTimeout(() => btnClicked = false, timeout);
    }
  }

  // The text and icon that will be displayed on the button; how that looks
  // depends on the state of the click and the selection of captions available.
  const btnText = () => btnClicked === false ? caption : clickedCaption;
  const btnIcon = () => btnClicked === false ? icon : clickedIcon;
</script>


<wa-button bind:this={button} {variant} {appearance} {disabled} on:click={btnClick}>
  <Icon name={btnIcon()} padRight={btnText() !== '' ? '4px' : undefined}></Icon>
  {btnText()}
</wa-button>
