<script>
  import { LoadZone, Table, Flex, Grid, Button, Icon, Text, Chip } from "@axel669/zephyr";

  import BackButton from '$components/BackButton.svelte';
  import BGGLink from '$components/BGGLink.svelte';
  import GameImage from '$components/GameImage.svelte';
  import SlugList from '$components/SlugList.svelte';

  import { DateTime, Interval } from 'luxon';


  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // Receive paramters from the URL route that landed us on this page; this
  // will contain the slug that we need in order to display the details pane.
  // The paramters come from the named arguments in the route itself.
  export let params = {};

  // ---------------------------------------------------------------------------

  // The base link to the API
  const API = `${process.env.GAME_API_ROOT_URI}/api/v1`;

  export let gameLink = '#/game/:slug';

  // Default to an empty game and a session title that is the id paramter;
  // these will be laoded when the session loads.
  // Default the name on the page to the sessionId that was used to load it,
  // until the data is fully loaded.
  let name = 'Unknown';
  let slug = 'unknown';
  let title = params.id;

  // Using the props that we were given, generate out the kinds of links that
  // the table needs to generate internal links to the data that it contains.
  const slugLink = slug => gameLink.replaceAll(':slug', slug);

  // Fetch the list of data that we need from the back end API, and return
  // the result back.
  const loadData = async () => {
    const dataURI = `${API}/session/${params.id}`;

    const response = await fetch(dataURI);
    const result = await response.json();

    name = result.data.name;
    slug = result.data.slug;
    title = result.data.title;

    // Convert the incoming session begin and end into DateTime for easier
    // handling.
    const begin = DateTime.fromISO(result.data.sessionBegin);
    const end   = DateTime.fromISO(result.data.sessionEnd);

    // Calculate the duration; we want this to be in minutes unless the game
    // look at least an hour
    let duration = Interval.fromDateTimes(begin, end).toDuration(['minutes']);
    if (duration.minutes > 60) {
      duration = duration.shiftTo('hours', 'minutes');
    }

    // Store back now
    result.data.sessionBegin = begin
    result.data.sessionEnd = end
    result.data.sessionDuration = duration;

    return result.data;
  };
</script>

<Flex direction="column">
  <Flex direction="row">
    <BackButton />
    <h3><a href="{slugLink(slug)}">{name}</a></h3>
  </Flex>
  <h3>{title}</h3>
</Flex>

<LoadZone source={loadData()} let:result>
  <Grid cols="max-content auto" gap="8px">
    <GameImage imagePath={result.imagePath} name={result.name} />
      <Text p="8px" b.l="1.5px solid gray">
        {@html result.content}
      </Text>
  </Grid>
  <Flex gap="16px" fl.wr="wrap" direction="row">
    {#if result.isLearning}
      <Chip color="accent" fill>Learning Game!</Chip>
    {/if}
    <Chip color="secondary" fill>
      Played {result.sessionBegin.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}

      @
      {result.sessionBegin.toLocaleString(DateTime.TIME_SIMPLE)}
      <Icon name="arrow-right"></Icon>
      {result.sessionEnd.toLocaleString(DateTime.TIME_SIMPLE)}

      ({result.sessionDuration.toHuman({'unitDisplay': 'short'})})
    </Chip>
  </Flex>

  <Table data={result.players} fillHeader color="primary">
    <tr slot="header">
      <th ws-x="w[64px]">ID</th>
      <th ws-x="w[16px]"></th>
      <th ws-x="w[16px]"></th>
      <th>Name</th>
      <th ws-x="w[16px]">Score</th>
    </tr>
    <tr slot="row" let:row>
      <td>{row.userId}</td>
      <td>
        {#if row.isStartingPlayer}
          <Icon name="flag-2-filled" c="&primary"></Icon>
        {/if}
      </td>
      <td>
        {#if row.isWinner}
          <Icon name="trophy-filled" c="&secondary"></Icon>
        {/if}
      </td>
      <td>
        {row.name}
      </td>
      <td>
        {row.score}
      </td>
    </tr>
  </Table>

  {#if result.expansions.length > 0}
  <Table data={result.expansions} fillHeader color="secondary">
    <tr slot="header">
      <th ws-x="w[64px]">ID</th>
      <th>Expansion</th>
      <th ws-x="w[16px]">Ext</th>
    </tr>
    <tr slot="row" let:row>
      <td>
        {row.gameId}
      </td>
      <td>
        <GameImage imagePath={row.imagePath} name={row.name} icon={true} />
        <a href="{slugLink(row.slug)}">{row.name}</a>
      </td>
      <td>
        <BGGLink bggId={row.bggId} />
      </td>
    </tr>
  </Table>
  {/if}
</LoadZone>

<style>
  h3 {
    text-transform: capitalize;
  }
</style>