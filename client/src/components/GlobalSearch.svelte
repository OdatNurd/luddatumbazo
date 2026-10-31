<script>
  import { onDestroy } from 'svelte';

  import { search, searchRevision } from '$stores/search';
  import { navigate } from '$lib/router.js';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The placeholder text shown in the input when it is empty.
  export let placeholder = 'Search games and people…';

  // Invoked when a result is chosen and navigation has happened, so that a host
  // (such as the mobile search dialog) can tear itself down.
  export let close = () => {};

  // ---------------------------------------------------------------------------

  // The combobox element, so that we can feed it options and clear it after a
  // pick.
  let combobox = null;

  // Build one option element. Values carry the route to navigate to so that a
  // selection is just "go there".
  const option = (value, label) => {
    const element = document.createElement('wa-option');
    element.setAttribute('value', value);
    element.setAttribute('label', label);
    element.textContent = label;
    return element;
  };

  // A non selectable row used as a section header; it carries the section's
  // live match count (e.g. "Games (7)").
  const header = (label, count) => {
    const element = document.createElement('wa-option');
    element.setAttribute('value', `__header_${label}__`);
    element.setAttribute('label', label);
    element.setAttribute('disabled', '');
    element.innerHTML = '';

    const strong = document.createElement('strong');
    strong.textContent = `${label} (${count})`;
    element.appendChild(strong);

    return element;
  };

  // The combobox data source; in server mode the control calls this with the
  // typed query and an abort signal, and displays exactly what we return.
  // Results are grouped into sections with wa-divider separators.
  const dataSource = async ({ query, signal }) => {
    const sections = await search(query, signal);

    if (signal.aborted === true) {
      return [];
    }

    const elements = [];

    for (const section of sections) {
      if (elements.length > 0) {
        const divider = document.createElement('wa-divider');
        elements.push(divider);
      }

      elements.push(header(section.label, section.count));

      for (const match of section.matches) {
        elements.push(option(match.href, match.name));
      }
    }

    return elements;
  };

  // Hand the data source to the control as soon as it exists.
  $: if (combobox !== null) {
    combobox.dataSource = dataSource;
  }

  // A local mutation invalidates the shared index. The combobox also skips a
  // request when the query has not changed since the last one, so force it to
  // ask the data source again rather than leaving the pre-mutation options in
  // place. A closed control may request an empty query, which only warms the
  // rebuilt index and does not change anything visible.
  const stopSearchRevision = searchRevision.subscribe(() => {
    if (combobox !== null) {
      void combobox.reload();
    }
  });

  onDestroy(stopSearchRevision);

  // Some soft keyboards (Samsung Keyboard in particular) wrap ordinary Latin
  // typing in an IME composition session that stays open until the word is
  // committed (usually by the keyboard's action key, "Go").
  //
  // The combobox deliberately suppresses data source requests while a
  // composition is in flight, so that half formed CJK text is never searched;
  // this means that on those keyboards results only appear once the word is
  // committed.
  //
  // Our queries are cheap in memory filters, so keep the search live instead:
  // whenever the input reports a change while the combobox believes it is mid
  // composition, drop that latch and request the current query directly. Typing
  // without a composition session is untouched (the latch is already clear and
  // the component's own request goes out).
  const liveSearch = () => {
    if (combobox === null || combobox.isComposing !== true) {
      return;
    }

    combobox.isComposing = false;
    void combobox.requestOptions({ debounce: true });
  };

  // On a pick, clear the box and send the browser to the chosen route. Both the
  // value and the displayed text have to be cleared: the value alone leaves the
  // picked label sitting in the input.
  const picked = (event) => {
    const value = event.target.value;

    if (typeof value === 'string' && value.startsWith('/')) {
      event.target.value = '';
      event.target.inputValue = '';
      navigate(value);
      close();
    }
  };
</script>


<wa-combobox
  bind:this={combobox}
  {placeholder}
  label="Search"
  size="s"
  class="global-search wa-visually-hidden-label"
  with-clear
  on:input={liveSearch}
  on:change={picked}
>
  <span slot="empty">Type to search games, categories, mechanics, designers, artists and publishers.</span>
  <span slot="no-results">No matches</span>
</wa-combobox>


<style>
  /* The control takes its host's width; its label stays out of sight via the
   * `wa-visually-hidden-label` utility (it remains the accessible name) and the
   * placeholder carries the affordance instead. */
  wa-combobox {
    width: 100%;
  }
</style>
