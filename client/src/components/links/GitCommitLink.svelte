<script>
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  // The version number of the application as taken from package.json
  export let version;

  // The commit hash of the link to generate
  export let commit;

  // ---------------------------------------------------------------------------

  // Get the configured project root URI
  const rootURI = `${process.env.GITHUB_ROOT_URI}`;

  // Determine what the link text would be; this is the first 8 characters of
  // the commit hash, or Unknown if there is no commit hash given. In both
  // cases the version number is prefixed on it
  const linkText = (commit === null)
      ? `v${version}-unknown`
      : `v${version}-${commit.substr(0, 8)}`;
</script>


{#if commit === null }
  <span class="muted">{linkText}</span>
{:else}
  <a href="{rootURI}/commit/{commit}" target="_blank" rel="noreferrer">
    {linkText}
  </a>
{/if}
