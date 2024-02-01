<script>
  import { Button, Icon } from "@axel669/zephyr";

  import { pop } from 'svelte-spa-router';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

</script>


<Button fill color="@secondary" on:click={() => pop()}>
  <Icon name="arrow-left"></Icon>
</Button>
