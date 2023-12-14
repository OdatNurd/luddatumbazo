<script>
  import { Flex, Button, Icon } from "@axel669/zephyr";

  import { location, push } from 'svelte-spa-router';

  let name = 'something';

  // Cause the router to jump back to the base
  const back = () => push('/games')

</script>

<Flex direction="row">
  <Button fill color="secondary"  on:click={back}> <Icon name="arrow-left"></Icon> </Button>
  <h3>Game: {name}</h3>
</Flex>
I am details of a game


<style>
  h3 {
    text-transform: capitalize;
  }
</style>