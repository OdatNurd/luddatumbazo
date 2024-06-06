<script>
  import { Flex} from "@axel669/zephyr";
  import IconButton from '$components/IconButton';

  import { pop } from 'svelte-spa-router';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

</script>

<Flex direction="row">
  <IconButton fill color="@secondary" caption="" icon="arrow-left" on:click={() => pop()} />
  <slot />
</Flex>

