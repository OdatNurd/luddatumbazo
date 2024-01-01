<script>
  import { LoadZone, Table, Flex, Button, Link, Icon, Text, Chip } from "@axel669/zephyr";

  import BackButton from '$components/BackButton.svelte';
  import SlugList from '$components/SlugList.svelte';


  import { DateTime } from 'luxon';


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
  let title = params.id;

  // Using the props that we were given, generate out the kinds of links that
  // the table needs to generate both internal and external links to the data
  // that it contains.
  const slugLink = slug => gameLink.replaceAll(':slug', slug);
  const bggLink = bggId => `https://boardgamegeek.com/boardgame/${bggId}/`;

  // Fetch the list of data that we need from the back end API, and return
  // the result back.
  const loadData = async () => {
    const dataURI = `${API}/session/${params.id}`;

    const response = await fetch(dataURI);
    const result = await response.json();

    name = result.data.name;
    title = result.data.title;
    return result.data;
  };
</script>

<Flex direction="column">
  <Flex direction="row">
    <BackButton />
    <h3>{name}</h3>
  </Flex>
  <h3>{title}</h3>
</Flex>

<LoadZone source={loadData()} let:result>
  {#if result.imagePath !== undefined}
    <div ws-x="t.a[center]">
      <img src={result.imagePath} alt="Box art image for game {result.name}">
    </div>
  {/if}
  <Chip color="secondary" fill>
    {DateTime.fromISO(result.sessionBegin).toLocaleString(DateTime.DATETIME_SHORT)}
    <Icon name="arrow-right"></Icon>
    {DateTime.fromISO(result.sessionEnd).toLocaleString(DateTime.DATETIME_SHORT)}
  </Chip>
  {#if result.isLearning}
    <Chip color="accent" fill>Learning Game!</Chip>
  {/if}
  <Text p="8px" b.t="1.5px solid gray" b.b="1.5px solid gray">
    {@html result.content}
  </Text>

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
        {#if row.imagePath !== undefined}
          <img ws-x="p.r[4px] w[32px] h[32px]" src={row.imagePath} alt="Box art image for game {row.name}">
        {/if}
        <a href="{slugLink(row.slug)}">{row.name}</a>
      </td>
      <td>
        {#if row.bggId !== 0}
          <Link href="{bggLink(row.bggId)}" target="_blank">
            BGG <Icon name="external-link"></Icon>
          </Link>
        {:else}
          --
        {/if}
      </td>
    </tr>
  </Table>
  {/if}

</LoadZone>

<style>
  h3 {
    text-transform: capitalize;
  }
  img {
    vertical-align: middle;
    object-fit: contain;
  }
</style>