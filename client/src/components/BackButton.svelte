<script>
  import { Flex, Button, Icon } from "@axel669/zephyr";

  import { pop } from 'svelte-spa-router';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

</script>

<Flex direction="row">
  <Button fill color="@secondary" on:click={() => pop()}>
    <Icon name="arrow-left"></Icon>
  </Button>
  <slot />
</Flex>

