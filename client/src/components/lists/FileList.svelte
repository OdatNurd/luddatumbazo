<script>
  import LoadZone from '$components/LoadZone.svelte';
  import DataGrid from '$components/DataGrid.svelte';
  import FileInfoDialog from '$components/dialogs/FileInfoDialog.svelte';

  import * as cells from '$lib/cells.js';

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


  // ---------------------------------------------------------------------------

  // The file whose details are currently presented in the info dialog, if any.
  let infoFile = null;

  // Open the file info dialog for the file in the given row.
  const showInfo = row => infoFile = row;

  // The columns of the grid; the name links to the underlying file and the info
  // column opens a dialog with the file's details.
  const columns = [
    {
      field: 'id',
      label: 'ID',
      width: 72,
      sortFn: 'alphanumeric'
    },
    {
      field: 'description',
      label: 'Name',
      filterable: true,
      filterType: 'text',
      flex: 1,
      formatter: (value, row) => cells.link(fileLink(row.bucketKey), row.description, { external: true })
    },
    {
      id: 'info',
      label: 'Info',
      width: 72,
      align: 'center',
      sortable: false,
      formatter: (value, row) => {
        const button = document.createElement('wa-button');
        button.setAttribute('appearance', 'plain');
        button.setAttribute('title', 'File details');
        button.append(cells.icon('info-circle-fill'));
        button.addEventListener('click', () => showInfo(row));

        return button;
      }
    }
  ];

  // Fetch the list of data that we need from the back end API, and return
  // the result back after filtering it.
  const loadData = async param => filter (await loader(param));

  // Generate a link to an asset file given its bucket key; the bucket key is
  // relative (it has no leading slash), and the result is always an absolute
  // URL on whichever origin we happen to be running on.
  const fileLink = key => new URL(
    `${process.env.GAME_API_ROOT_URI}/${key.replace(/^\/+/, '')}`,
    window.location.origin
  ).href;

</script>

<FileInfoDialog
  file={infoFile}
  {gameName}
  open={infoFile !== null}
  onclose={() => infoFile = null}
/>

<LoadZone source={loadData(loaderKey)} let:result>
  <DataGrid data={result} {columns} pageSize={Math.min(Math.max(result.length, 1), pageSize)} />

  <svelte:fragment slot="error" let:error>
    {error}
  </svelte:fragment>
</LoadZone>
