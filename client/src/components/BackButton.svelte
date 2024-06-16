<script>
  import { Flex } from "@axel669/zephyr";
  import IconButton from '$components/IconButton';


  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

</script>

<Flex direction="row">
  <IconButton fill color="@secondary" caption="" icon="arrow-left" on:click={() => window.history.back()} />
  <slot />
</Flex>

