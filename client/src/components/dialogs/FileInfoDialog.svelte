<script>
  import { DateTime } from 'luxon';

  import { toast } from '$lib/toast.js';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Whether the dialog is currently presented.
  export let open = false;

  // The name of the game that the file the dialog is for.
  export let gameName = undefined;

  // An object that represents the asset record for this particular file; this
  // can be null while the dialog is closed.
  export let file = null;

  // ---------------------------------------------------------------------------

  // Invoked when the dialog closes; the detail is always { result: null }
  // (the dialog is informational only).
  export let onclose = undefined;

  // Ensure we only report a close once, no matter how the dialog goes away.
  let settled = false;

  $: if (open === true) {
    settled = false;
  }

  const dismiss = () => {
    if (settled === false) {
      settled = true;
      onclose?.({ result: null });
    }
  };

  // Generate a link to an asset file given its bucket key; the bucket key is
  // relative (it has no leading slash), and the result is always an absolute
  // URL on whichever origin we happen to be running on.
  const fileLink = key => new URL(
    `${process.env.GAME_API_ROOT_URI}/${key.replace(/^\/+/, '')}`,
    window.location.origin
  ).href;

  // Fire a toast to provide extra feedback that a link was copied, and then
  // actually copy the link to the clipboard.
  const copyLink = () => {
    toast('Link Copied!', { icon: 'copy', variant: 'success', duration: 1500 });
    navigator.clipboard.writeText(fileLink(file.bucketKey));
  }

</script>

<wa-dialog {open} label="File Details" style="min-width: min(480px, 90vw)" on:wa-hide={dismiss}>
  {#if file !== null}
    <h3 slot="header">File Details: {file.bucketKey.split('/').at(-1)}</h3>

    <div class="stack">
      <div>
        <strong>Game</strong>
        <div class="muted">{gameName}</div>
      </div>

      <div>
        <strong>Original Name</strong>
        <div class="muted">{file.filename}</div>
      </div>

      <div>
        <strong>Originally Uploaded</strong>
        <div class="muted">{DateTime.fromISO(file.createdAt).toLocaleString(DateTime.DATETIME_SHORT)}</div>
      </div>

      {#if file.updatedAt !== null}
        <div>
          <strong>Re-uploaded</strong>
          <div class="muted">{DateTime.fromISO(file.updatedAt).toLocaleString(DateTime.DATETIME_SHORT)}</div>
        </div>
      {/if}

      <div class="file-description">{file.description}</div>

      <!-- wa-button wraps a real <button>; the a11y warnings are false positives. -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="outlined" variant="neutral" on:click={copyLink}>
        Copy File Link
      </wa-button>
    </div>
  {/if}
</wa-dialog>

<style>
  .file-description {
    padding-top: 8px;
    border-top: 1.5px solid var(--wa-color-surface-border);
    white-space: pre-wrap;
  }
</style>
