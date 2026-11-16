/******************************************************************************/


import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';


/******************************************************************************/


/* Execute the given git command and return a string version of the standard
 * output on success.
 *
 * If the executed command returns non-0, the function will return null instead
 * of a string. */
function executeGitCommand(gitCmd) {
  try {
    const result = execSync(gitCmd);
    return result.toString().trim();
  }
  catch {
    return null;
  }
}


/******************************************************************************/


/* Attempt to get the commit hash for the most recent commit made in the
 * repository found in the current directory, and return it back as a string.
 *
 * If there is any issue with obtaining the hash, including git not being
 * installed or the current directory not being controlled by git, null is
 * returned instead. */
function getCommitHash() {
  return executeGitCommand('git rev-parse HEAD');
}


/******************************************************************************/


/* Determine if the current working tree is dirty, i.e. if there are any files
 * that have uncommited changes and return an appropriate boolean result. */
function isTreeDirty() {
  return executeGitCommand('git diff-files --quiet --ignore-submodules --') === null;
}


/******************************************************************************/


/* Get the application version from package.json so that the version shown by
 * the worker is the version that was actually built, not one that the client
 * guessed at compile time. */
function getVersion() {
  try {
    return JSON.parse(readFileSync('package.json', 'utf8')).version ?? null;
  }
  catch {
    return null;
  }
}


/******************************************************************************/


/* Entrypoint. */
export function main() {
  const commit = getCommitHash();
  const releaseDate = new Date();

  // The build id is the value the client compares with the worker. A release
  // date makes it unique even when the same commit is rebuilt, while the commit
  // keeps it easy to identify which revision was deployed.
  const buildId = `${commit ?? 'unknown'}-${releaseDate.toISOString()}`;

  // Calculate the required output for the build reference file.
  const output = JSON.stringify({
    version: getVersion(),
    releaseDate,
    commit,
    treeIsDirty: (commit === null) ? false : isTreeDirty(),
    buildId,
  }, null, 2);

  if (process.argv.indexOf('--debug') != -1) {
    console.log('*******************************************************');
    console.log('*                   RELEASE INFO                      *');
    console.log('*******************************************************');
    console.log(output);
    console.log('*******************************************************');
  }

  writeFileSync('commitReference.js', `export const commitReference = ${output};\n`);
}


/******************************************************************************/


main();
