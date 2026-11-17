/******************************************************************************/


import fs from "fs";
import path from "path";


/******************************************************************************/


// The dump folder
const dumpPath = path.resolve('dump');


/******************************************************************************/


/* Entrypoint. */
async function main() {
  if (fs.existsSync(dumpPath) === false) {
      fs.mkdirSync(dumpPath, { recursive: true });
  }
}


/******************************************************************************/

main();