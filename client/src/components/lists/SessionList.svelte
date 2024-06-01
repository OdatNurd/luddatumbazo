<script>
  import { Link, Icon, LoadZone, DataTable, TH, sorts, filters } from "@axel669/zephyr";
  import { DateTime } from 'luxon';

  import { server } from '$stores/server';

  import GameImage from '$components/GameImage.svelte';

  import { api } from '$api';


  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // We can be used to gather session data in a variety of different ways. The
  // component accepts an async callback that is responsible for gathering the
  // data.
  //
  // The result of the callback should be a promise that resolves to an array of
  // short session objects.
  export let loader = async () => [];

  // When this property is true, the table displays an extra column that has a
  // link to the game that the session is for.
  export let showGames = true;

  // Set the number of rows that are visible in the data table per page
  export let pageSize = 20;

  // The color to use for the table
  export let color = "@primary";

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


  // ---------------------------------------------------------------------------

  // This is a duplicate of the natural sort order from sorts.natural() but
  // based on how we may want to have incoming dates be actual dates and not
  // strings, I'm going to leave this here so that when the time comes I can
  // do less work, cause lazy.
  const dateSort = (propName) => {
    const comparitor = new Intl.Collator(undefined, { numeric: true })
    return (a, b) => comparitor.compare(a[propName], b[propName])
  }
</script>


<LoadZone source={loader()} let:result>
  <DataTable data={result} pageSize={showGames ? pageSize : Math.min(result.length, pageSize)} {color}>
    <svelte:fragment slot="header">
      <TH w="64px" sort={sorts.natural("id")}>ID</TH>
      <TH w="32px"></TH>
      <TH w="32px"></TH>
      <TH filter={filters.text("title")} sort={sorts.natural("title")}>Name</TH>
      <TH sort={dateSort("sessionBegin")} w="64px">Date</TH>
      {#if showGames === true}
        <TH w="64px">Game</TH>
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="row" let:row>
      <td>{row.id}</td>
      <td>
        <Icon c="@primary" name={server.gameTypeIcon(row.playType)}></Icon>
      </td>
      <td>
        {#if row.isLearning}
          <Icon c="@secondary" name="mortarboard-fill"></Icon>
        {/if}
      </td>
      <td>
        <GameImage imagePath={row.imagePath} name={row.name} icon={true} />
        <a href="{session(row.id)}">{row.title}</a>
      </td>
      <td>
        {DateTime.fromISO(row.sessionBegin).toLocaleString(DateTime.DATETIME_SHORT)}
      </td>
      {#if showGames === true}
        <td>
          <Link href="{game(row.slug)}">
            <Icon name="link-45deg"></Icon>
          </Link>
        </td>
      {/if}
    </svelte:fragment>
  </DataTable>

  <svelte:fragment slot="error" let:error>
    {error}
  </svelte:fragment>
</LoadZone>
