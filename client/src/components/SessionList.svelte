<script>
  import { Link, Icon, LoadZone, DataTable, TH, sorts, filters } from "@axel669/zephyr";
  import { DateTime } from 'luxon';

  import GameImage from '$components/GameImage.svelte';

  import { api } from '$lib/fetch.js';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The underlying API query to use to populate the list. This should fetch a
  // data item that has a "results" key that is a list of objects with the
  // keys: ['id', 'bggId', 'slug', 'name']
  export let query = '/session/list';

  // After making the query, this function is invoked on the dataset that is
  // returned in order to filter the data set into the list of items that should
  // be displayed in the list.
  export let filter = result => result.data;

  // ---------------------------------------------------------------------------

  // The links in all of the table entries link to either sessions by ID or
  // games by their slug. These set what the URL pattern for such links looks
  // like. The placeholder is replaced in the URL when it's expanded.
  const baseLink = '#/session/:id';
  const gameLink = '#/game/:slug';

  // Using the props that we were given, generate out the kinds of links that
  // the table needs to generate both internal and external links to the data
  // that it contains.
  const session = id => baseLink.replaceAll(':id', id);
  const game = slug => gameLink.replaceAll(':slug', slug);

  // The different types of games.
  const gameTypeIcons = {
    "cardboard": "box",
    "boardgamearena": "world-www",
    "steam": "brand-steam",
    "gog": "device-desktop",
    "android": "brand-andriod"
  }

  // ---------------------------------------------------------------------------

  // Fetch the list of data that we need from the back end API, and return
  // the result back.
  const loadData = async () => {
    const response = await api(query);
    const result = await response.json();

    return filter(result);
  };

  // This is a duplicate of the natural sort order from sorts.natural() but
  // based on how we may want to have incoming dates be actual dates and not
  // strings, I'm going to leave this here so that when the time comes I can
  // do less work, cause lazy.
  const dateSort = (propName) => {
    const comparitor = new Intl.Collator(undefined, { numeric: true })
    return (a, b) => comparitor.compare(a[propName], b[propName])
  }
</script>


<LoadZone source={loadData()} let:result>
  <DataTable data={result} pageSize={20} color="@primary">
    <svelte:fragment slot="header">
      <TH w="64px" sort={sorts.natural("id")}>ID</TH>
      <TH w="32px"></TH>
      <TH w="32px"></TH>
      <TH filter={filters.text("title")} sort={sorts.natural("title")}>Name</TH>
      <TH sort={dateSort("sessionBegin")} w="64px">Date</TH>
      <TH w="64px">Game</TH>
    </svelte:fragment>
    <svelte:fragment slot="row" let:row>
      <td>{row.id}</td>
      <td>
        <Icon c="@primary" name={gameTypeIcons[row.playType] ?? 'question-mark'}></Icon>
      </td>
      <td>
        {#if row.isLearning}
          <Icon c="@secondary" name="school"></Icon>
        {/if}
      </td>
      <td>
        <GameImage imagePath={row.imagePath} name={row.name} icon={true} />
        <a href="{session(row.id)}">{row.title}</a>
      </td>
      <td>
        {DateTime.fromISO(row.sessionBegin).toLocaleString(DateTime.DATETIME_SHORT)}
      </td>
      <td>
        <Link href="{game(row.slug)}">
          <Icon name="link"></Icon>
        </Link>
      </td>
    </svelte:fragment>
  </DataTable>
</LoadZone>
