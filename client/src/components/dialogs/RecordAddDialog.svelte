<script>
  import { AsyncButton, Button, Dialog, Titlebar, Text, Icon, Select, handler$ } from "@axel669/zephyr";

  import { user } from '$stores/user';

  import { onMount } from 'svelte';
  import { api } from '$api';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The component that opens the drawer gives us a close prop as a function
  // that we can invoke in order to close the drawer.
  export let close;

  export let title = "Title Goes Here"
  export let description = "Short term on what the dialog is for";

  export let game = '';
  export let dataType = 'collection';
  export let names = [];
  export let options = [];
  export let optionLabel = 'Unknown';

  // ---------------------------------------------------------------------------

  let name;
  let optionValue;

  // ---------------------------------------------------------------------------

  // When we mount, set the default values of the select tags.
  onMount(() => {
    if (names.length > 0) {
      name = names[0].value;
    }

    if (options.length > 0) {
      optionValue = options[0].value;
    }
  });

  // Abort the dialog, returning back that no operation took place.
  const abort = handler$(result => close({ result: null, dataType }));

  // Apply the data change, returning back the new record.
  const apply = async(game, name, optionValue) => {
    // TODO:
    // Disable the form buttons and controls

    // Determine what action we need to carry out.
    const action = (dataType === 'collection')
      ? api.household.collection.add
      : api.household.wishlist.contents.add

    // Perform the actual insertion and gather the result back.
    const result = await action($user.household, game, name, optionValue);

    // Send the loaded data back to the caller, along with it's type.
    close({ dataType, result });
  }

</script>

<Dialog >
  <Titlebar slot="header">
    <Text slot="title" title> {title} </Text>

    <Button m="2px" w="44px" color="@primary" slot="action" on:click={abort(null)}>
      <Icon name="x-square"></Icon>
    </Button>
  </Titlebar>

  <Select bind:value={name} color="@primary" options={names} label="Name" />
  <Select bind:value={optionValue} color="@primary" {options} label={optionLabel} />
  <Titlebar slot="footer">
    <Button fill m="2px" w="44px" color="@danger" slot="menu" on:click={abort(null)}>
      <Icon name="x"></Icon>
    </Button>

    <Text slot="title" subtitle> {description} </Text>

    <AsyncButton fill m="2px" w="44px" color="@secondary" slot="action" handler={async () => apply(game, name, optionValue)}>
      <Icon name="check"></Icon>
    </AsyncButton>
  </Titlebar>
</Dialog>