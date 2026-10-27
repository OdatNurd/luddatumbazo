<script>
  import { createEventDispatcher, onMount } from 'svelte';

  import { user } from '$stores/user';

  import { api } from '$api';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Whether the dialog is currently presented.
  export let open = false;

  export let title = "Title Goes Here"
  export let description = "Short term on what the dialog is for";

  export let game = '';
  export let dataType = 'collection';
  export let names = [];
  export let options = [];
  export let optionLabel = 'Unknown';

  // ---------------------------------------------------------------------------

  // Fired when the dialog closes; the detail is { result, dataType } where
  // result is null on cancellation or the new record when applied.
  const dispatch = createEventDispatcher();

  let name;
  let optionValue;

  // Ensure we only report a close once, no matter how the dialog goes away.
  let settled = false;

  $: if (open === true) {
    settled = false;
  }

  const settle = detail => {
    if (settled === false) {
      settled = true;
      dispatch('close', detail);
    }
  };

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
  const abort = () => settle({ result: null, dataType });

  // Close only when the dialog itself hides (escape, overlay click); the
  // selects inside of us emit hide events of their own when their dropdowns
  // close, and those bubble up here without meaning the dialog is going away.
  const dismissed = event => {
    if (event.target === event.currentTarget) {
      abort();
    }
  };

  // Apply the data change, returning back the new record.
  const apply = async () => {
    // Determine what action we need to carry out.
    const action = (dataType === 'collection')
      ? api.household.collection.add
      : api.household.wishlist.contents.add

    // Perform the actual insertion and gather the result back.
    const result = await action($user.household, game, name, optionValue);

    // Send the loaded data back to the caller, along with it's type.
    settle({ dataType, result });
  }

  // Keep a select's value up to date regardless of which change style the
  // underlying component fires.
  const pick = (target, set) => set(target.value);

  // The option lists are keyed by their value, so each list is collapsed to its
  // first entry per value: a game's name list can carry duplicates (and so can
  // a publisher list), which would otherwise break the keyed list.
  const dedupe = entries => entries.filter((entry, index) =>
    entries.findIndex(other => other.value === entry.value) === index);

  $: uniqueNames = dedupe(names);
  $: uniqueOptions = dedupe(options);
</script>

<wa-dialog {open} label={title} style="min-width: min(480px, 90vw)" on:wa-hide={dismissed}>
  <h3 slot="header">{title}</h3>

  <div class="stack">
    <wa-select label="Name" value={name}
               on:change={e => pick(e.target, v => name = v)}
               on:wa-input={e => pick(e.target, v => name = v)}>
      {#each uniqueNames as entry (entry.value)}
        <wa-option value={entry.value}>{entry.label}</wa-option>
      {/each}
    </wa-select>

    <wa-select label={optionLabel} value={optionValue}
               on:change={e => pick(e.target, v => optionValue = v)}
               on:wa-input={e => pick(e.target, v => optionValue = v)}>
      {#each uniqueOptions as entry (entry.value)}
        <wa-option value={entry.value}>{entry.label}</wa-option>
      {/each}
    </wa-select>
  </div>

  <div slot="footer" class="record-actions">
    <div class="muted">{description}</div>

    <div class="row">
      <!-- wa-button renders a real <button> in its shadow DOM, so it is
           keyboard accessible and interactive; the compiler cannot know that. -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="outlined" variant="danger" on:click={abort}>Cancel</wa-button>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button appearance="filled" variant="brand" on:click={apply}>Apply</wa-button>
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
