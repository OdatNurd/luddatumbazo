/******************************************************************************/


import { writeFileSync } from "fs";

import util from "util";
import { execSync } from "child_process";


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


/* Entrypoint. */
export function main() {
  // Calculate the required output for the commit reference page.
  const output = JSON.stringify({
    releaseDate: new Date(),
    commit: getCommitHash(),
    treeIsDirty: isTreeDirty(),
  }, null, 2);

  console.log('*******************************************************');
  console.log('*                   RELEASE INFO                      *');
  console.log('*******************************************************');
  console.log(output);
  console.log('*******************************************************');

  writeFileSync('commitReference.js', `export const commitReference = ${output}`);
}


/******************************************************************************/

main();