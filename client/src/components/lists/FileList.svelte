<script>
  import { LoadZone, DataTable, TH, Link, sorts, filters } from "@axel669/zephyr";

  import { DateTime } from 'luxon';

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

  // ---------------------------------------------------------------------------

  // Fetch the list of data that we need from the back end API, and return
  // the result back after filtering it.
  const loadData = async param => filter (await loader(param));

  // Generate a link to an asset file given its bucket key
  const fileLink = key => `${process.env.GAME_API_ROOT_URI}${key}`;

  // This is a duplicate of the natural sort order from sorts.natural() but
  // based on how we may want to have incoming dates be actual dates and not
  // strings, I'm going to leave this here so that when the time comes I can
  // do less work, cause lazy.
  const dateSort = (propName) => {
    // TODO: This should sort between the updated and created fields in case
    //       both are present.
    const comparitor = new Intl.Collator(undefined, { numeric: true })
    return (a, b) => comparitor.compare(a[propName], b[propName])
  }
</script>


<LoadZone source={loadData(loaderKey)} let:result>
  <DataTable data={result} pageSize={Math.min(result.length, pageSize)} color="@secondary">
    <svelte:fragment slot="header">
      <TH w="64px" sort={sorts.natural("id")}>ID</TH>
      <TH filter={filters.text("description")} sort={sorts.natural("name")}>Name</TH>
      <TH sort={dateSort("createdAt")} w="64px">Date</TH>
    </svelte:fragment>
    <svelte:fragment slot="row" let:row>
      <td>{row.id}</td>
      <td>
        <Link href="{fileLink(row.bucketKey)}" target="_blank">
          {row.description}
        </Link>
      </td>
      <td>
        {DateTime.fromISO(row.updatedAt || row.createdAt).toLocaleString(DateTime.DATETIME_SHORT)}
      </td>
    </svelte:fragment>
  </DataTable>

  <svelte:fragment slot="error" let:error>
    {error}
  </svelte:fragment>
</LoadZone>
