<script>
  import { api } from '$api';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Whether the dialog is currently presented.
  export let open = false;

  // The metadata type that the new record belongs to ('designer', 'artist',
  // 'publisher', 'category' or 'mechanic'). This names the dialog and picks
  // the API target.
  export let metaType = 'designer';

  // ---------------------------------------------------------------------------

  // Invoked when the dialog closes; the detail is { result } where result is
  // the list of records on success or null on cancellation.
  export let onclose = undefined;

  // The fields of the new record. The slug is not asked for: the back end
  // derives it from the name. A missing BGG id is filled in as 0 by the schema,
  // which is how a hand made entry is marked as opposed to a BGG import.
  let name = '';
  let bggId = '';

  // True while the add request is in flight; holds the Add button in its
  // loading state and keeps the dialog from closing underneath it.
  let saving = false;

  // The error from the last failed add, or null.
  let warning = null;

  // Ensure we only report a close once, no matter how the dialog goes away.
  let settled = false;

  $: if (open === true) {
    settled = false;
    saving = false;
    warning = null;
    name = '';
    bggId = '';
  }

  const settle = detail => {
    if (settled === false) {
      settled = true;
      onclose?.(detail);
    }
  };

  // Abort the dialog, returning back that no operation took place.
  const abort = () => {
    if (saving === true) {
      return;
    }

    settle({ result: null });
  };

  // Close only when the dialog itself hides (escape, overlay click).
  const dismissed = event => {
    if (event.target === event.currentTarget) {
      // A request in flight must not be interrupted; cancelling the hide keeps
      // the dialog on screen and its controlled open prop in sync with us.
      if (saving === true) {
        event.preventDefault();
        return;
      }

      abort();
    }
  };

  // Insert the record through the metadata bulk update endpoint (it accepts a
  // list and skips anything that already exists), then hand the result back so
  // that the caller can refresh its list. The request holds the Add button in
  // its loading state until it settles; the dialog stays open on failure so
  // that the error can be shown and the add retried.
  const save = async () => {
    if (saving === true) {
      return;
    }

    const trimmed = name.trim();
    if (trimmed === '') {
      return;
    }

    const record = { name: trimmed };
    const id = parseInt(bggId, 10);
    if (Number.isInteger(id) && id > 0) {
      record.bggId = id;
    }

    saving = true;
    warning = null;

    try {
      const result = await api.metadata.update(metaType, [record]);
      settle({ result });
    }
    catch (error) {
      warning = error.message ?? `unable to add the ${metaType}`;
    }
    finally {
      saving = false;
    }
  };

  // The record cannot be saved without at least a name.
  $: canSave = name.trim() !== '';

  // The capitalized type, for the dialog captions.
  $: niceType = metaType.charAt(0).toUpperCase() + metaType.slice(1);

  // Keep an input's value up to date as the user types. The component emits no
  // custom event of its own; the native input event crosses out of its shadow
  // DOM and is the only signal that fires per keystroke.
  const type = (target, set) => set(target.value);
</script>

<wa-dialog {open} label="Add {niceType}" style="min-width: min(480px, 90vw)" on:wa-hide={dismissed}>
  {#if warning !== null}
    <wa-callout variant="warning">{warning}</wa-callout>
  {/if}

  <div class="stack">
    <wa-input label="Name" value={name} required
              on:input={e => type(e.target, v => name = v)}
              on:change={e => type(e.target, v => name = v)}></wa-input>

    <wa-input label="BGG ID" type="number" value={bggId}
              on:input={e => type(e.target, v => bggId = v)}
              on:change={e => type(e.target, v => bggId = v)}>
      <span slot="hint">Optional; entries without one are recorded with a BGG id of 0.</span>
    </wa-input>

    <div class="muted">The slug is generated from the name when the record is saved.</div>
  </div>

  <div slot="footer" class="record-actions">
    <div class="muted">New {niceType}</div>

    <div class="row">
      <!-- wa-button renders a real <button> in its shadow DOM, so it is
           keyboard accessible and interactive; the compiler cannot know that. -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="outlined" variant="danger" on:click={abort}
                 disabled={saving}>Cancel</wa-button>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="filled" variant="brand" disabled={!canSave || saving}
                 loading={saving} on:click={save}>Add</wa-button>
    </div>
  </div>
</wa-dialog>

<style>
  .record-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    flex-wrap: wrap;
  }
</style>
