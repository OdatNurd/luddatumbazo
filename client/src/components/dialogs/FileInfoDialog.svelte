<script>
  import { Button, Grid, Dialog, Titlebar, Text, Icon, Select, Toast, handler$ } from "@axel669/zephyr";
  import IconButton from '$components/IconButton';

  import { DateTime } from 'luxon';

  import { user } from '$stores/user';

  import { onMount } from 'svelte';
  import { api } from '$api';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The component that opens the drawer gives us a close prop as a function
  // that we can invoke in order to close the drawer.
  export let close;

  // The name of the game that the file the dialog is for.
  export let gameName;

  // An object that represents the asset record for this particular file.
  export let file;

  // The Modal system will invoke the function with this property  when a click
  // is registered on the area outside of the dialog box. We take that
  // opportunity to close the dialog.
  export const cancel = () => close({ result: null });


  // ---------------------------------------------------------------------------

  // Abort the dialog, returning back that no operation took place.
  const abort = handler$(result => close({ result: null }));

  // Generate a link to an asset file given its bucket key
  const fileLink = key => `${process.env.GAME_API_ROOT_URI}${key}`;

  // The toaster element; this is used to fire toasts.
  let toaster = null;

  // Fire a toast to provide extra feedback that a link was copied, and then
  // actually copy the link to the clipboard.
  const copyLink = () => {
    toaster.show(1000, {
      message: 'Link Copied!',
      color: '@secondary',
      icon: 'copy'
    });
    navigator.clipboard.writeText(fileLink(file.bucketKey));
  }

</script>

<Toast bind:this={toaster} position="tc" />

<Dialog w.min="fit-content">
  <Titlebar slot="header">
    <Text slot="title" title> File Details: {file.bucketKey.split('/').at(-1)} </Text>

    <Button m="2px" w="44px" color="@primary" slot="action" on:click={abort(null)}>
      <Icon name="x-square"></Icon>
    </Button>
  </Titlebar>

  <Grid gap="8px">
    <Text title>Game</Text>
    <Text subtitle> {gameName}</Text>

    <Text title>Original Name</Text>
    <Text subtitle>{file.filename}</Text>

    <Text title>Originally Uploaded</Text>
    <Text subtitle>{DateTime.fromISO(file.createdAt).toLocaleString(DateTime.DATETIME_SHORT)}</Text>

    {#if file.updatedAt !== null}
      <Text title>Re-uploaded </Text>
      <Text subtitle>{DateTime.fromISO(file.updatedAt).toLocaleString(DateTime.DATETIME_SHORT)}</Text>
    {/if}

    <Text p.t="8px" b.t="1.5px solid gray">{file.description}</Text>

    <IconButton outline color="@secondary"
                caption="Copy File Link" clickedCaption="Link Copied!"
                icon="copy" clickedIcon="check-circle"
                on:click={copyLink} />
  </Grid>

</Dialog>