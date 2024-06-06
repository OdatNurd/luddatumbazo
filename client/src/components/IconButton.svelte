<script>
  import { createEventDispatcher } from 'svelte';

  import { Button, Icon } from "@axel669/zephyr";

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------


  // Control the style of the button that is presented; these props are sent
  // straight through to the underlying Zephyr button.
  export let color = '@default';
  export let fill = false;
  export let outline = false;
  export let disabled = false;

  // The caption of the button and the icon to use within it
  export let caption = 'derp derp derp';
  export let icon = 'layout-wtf';

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

  // ---------------------------------------------------------------------------

  const dispatch = createEventDispatcher();

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

  // The text that will be displayed on the button; how that looks depends on
  // the state of the click and the selection of captions available (if any)
  const btnText = () => btnClicked === false ? caption : clickedCaption;
</script>


<Button {fill} {outline} {color} {disabled} on:click={btnClick}>
  <Icon p.r={btnText() !== '' ? '4px' : ''} name={btnClicked == false ? icon : clickedIcon}></Icon>
  {btnText()}
</Button>
