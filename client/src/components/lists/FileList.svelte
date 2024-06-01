<script>
  import { EntryButton, Modal, LoadZone, DataTable, TH, Link, Icon, sorts, filters } from "@axel669/zephyr";

  import FileInfoDialog from '$components/dialogs/FileInfoDialog.svelte';


  import { api } from '$api';

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // A key that is provided to the provided loader, to control what it does.
  export let loaderKey = undefined;

  // We can be used to gather session data in a variety of different ways. The
  // component accepts an async callback that is responsible for gathering the
  // data.
  //
  // The result of the callback should be a promise that resolves to an array of
  // short session objects.
  export let loader = async () => [];

  // After making the query, this function is invoked on the dataset that is
  // returned in order to filter the data set into the list of items that should
  // be displayed in the list.
  export let filter = result => result;

  // The number of expansions to display per page
  export let pageSize = 5;

  // The game that the files in the list are for;
  export let gameName = undefined;
  export let gameSlug = undefined;

  // ---------------------------------------------------------------------------

  // Fetch the list of data that we need from the back end API, and return
  // the result back after filtering it.
  const loadData = async param => filter (await loader(param));

  // Generate a link to an asset file given its bucket key
  const fileLink = key => `${process.env.GAME_API_ROOT_URI}${key}`;

</script>

<Modal component={FileInfoDialog} />

<LoadZone source={loadData(loaderKey)} let:result>
  <DataTable data={result} pageSize={Math.min(result.length, pageSize)} color="@secondary">
    <svelte:fragment slot="header">
      <TH w="64px" sort={sorts.natural("id")}>ID</TH>
      <TH filter={filters.text("description")} sort={sorts.natural("name")}>Name</TH>
      <TH w="64px">Info</TH>
    </svelte:fragment>
    <svelte:fragment slot="row" let:row>
      <td>{row.id}</td>
      <td>
        <Link href="{fileLink(row.bucketKey)}" target="_blank">
          {row.description}
        </Link>
      </td>
      <td>
        <EntryButton this={Modal} component={FileInfoDialog} props={{ file: row, gameName, gameSlug }}>
          <Icon name="info-circle-fill"></Icon>
        </EntryButton>
      </td>
    </svelte:fragment>
  </DataTable>

  <svelte:fragment slot="error" let:error>
    {error}
  </svelte:fragment>
</LoadZone>
