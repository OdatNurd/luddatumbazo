/******************************************************************************/


import { writeFileSync } from "fs";

import util from "util";
import { execSync } from "child_process";


/******************************************************************************/


/* Attempt to get the commit hash for the most recent commit made in the
 * repository found in the current directory, and return it back as a string.
 *
 * If there is any issue with obtaining the hash, including git not being
 * installed or the current directory not being controlled by git, null is
 * returned instead. */
function getCommitHash() {
    try {
        const result = execSync('git rev-parse HEAD');
        return result.toString().trim();
    }
    catch {
        return null;
    }
}



/******************************************************************************/


/* Entrypoint. */
export function main() {
    const hash = getCommitHash();

    const output = `export const releaseHash = ${JSON.stringify(hash)};`;
    console.log(`  -> ${output}`);
    writeFileSync('commitReference.js', output);
}


/******************************************************************************/

main();