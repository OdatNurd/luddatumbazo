<script>
  import { Link } from "@axel669/zephyr"


  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The commit hash of the link to generate
  export let commit;

  // ---------------------------------------------------------------------------

  // Get the configured project root URI
  const rootURI = `${process.env.GITHUB_ROOT_URI}`;

  // Determine what the link text would be; this is the first 8 characters of
  // the commit hash, or Unknown if there is no commit hash given.
  const linkText = (commit === null)
      ? 'Unknown'
      : commit.substr(0, 8);
</script>


{#if commit === null }
  {linkText}
{:else}
  <Link href="{rootURI}/commit/{commit}" target="_blank">
    {linkText}
  </Link>
{/if}