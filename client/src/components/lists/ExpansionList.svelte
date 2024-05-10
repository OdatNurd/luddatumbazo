<script>
  import { DataTable, Text, TH, sorts, filters } from "@axel669/zephyr";

  import { api } from '$api';

  import BGGLink from '$components/links/BGGLink.svelte';


  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The list of items to display in the list; this can be undefined, in which
  // case the component displays nothing.
  export let data = undefined;

  // The title for the table
  export let title = undefined;

  // The number of expansions to display per page
  export let pageSize = 5;

  // ---------------------------------------------------------------------------

  // Generate a link to the game with the provided slug
  const slugLink = slug => '#/game/:slug'.replaceAll(':slug', slug);

</script>


<!-- *********************************************************************** -->


<Text title>{title ?? 'Unknown'}</Text>
{#if data.length === 0}
  <Text subtitle>No entries</Text>
{:else}
  <DataTable {data} pageSize={Math.min(data.length, pageSize)} color="@secondary">
    <svelte:fragment slot="header">
      <TH w="64px" sort={sorts.natural("id")}>ID</TH>
      <TH filter={filters.text("name")} sort={sorts.natural("name")}>Name</TH>
      <TH w="64px">Ext</TH>
    </svelte:fragment>
    <svelte:fragment slot="row" let:row>
      <td>{row.id ?? '--'}</td>
      <td>
        {#if row.slug !== null}
          <a href="{slugLink(row.slug)}">{row.name}</a>
        {:else}
          {row.name}
        {/if}
      </td>
      <td>
        <BGGLink bggType="boardgame" bggId={row.bggId} />
      </td>
    </svelte:fragment>
  </DataTable>
{/if}


<!-- *********************************************************************** -->
