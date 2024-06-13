<script>
  import { AsyncButton, Icon } from "@axel669/zephyr";

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

  // The handler that the button executes; the handler executes when the button
  // is clicked and the button will disable itself automagically while the
  // function is running.
  export let handler = async () => null;
</script>


<AsyncButton {fill} {outline} {color} {disabled} {handler}>
  <Icon p.r='4px' name={icon}></Icon>
  {caption}
</AsyncButton>
