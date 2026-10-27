/******************************************************************************/


import fs from "fs";
import os from "os";
import path from "path";
import util from "util";
import child_process from "child_process";

const exec = util.promisify(child_process.exec);


/******************************************************************************/


/* The folder that holds the local copy of the development D1 database; this
 * folder must exist, and a single .sqlite file must exist within it; otherwise
 * we are, as they say, unhappy.
 *
 * Where the MiniFlare state lives is a local convention (the same state store
 * is shared with every other project tested, usually), so several candidates 
 * are tried in order and the first that exists wins:
 *
 *   1. LUD_D1_STATE_DIR, a state root set explicitly in the environment; this
 *      is the value handed to wrangler's --persist-to.
 *   2. backend/.wrangler/state, a leftover from the two project (worker and
 *      pages) era; kept as a fallback in case a local checkout still has it.
 *   3. ~/.config/.wrangler/state, where the service:run script persists.
 *
 * The MiniFlare D1 objects always live in v3/d1/miniflare-D1DatabaseObject
 * below the state root, so only the root varies. */
const STATE_ROOTS = [
  process.env.LUD_D1_STATE_DIR,
  "backend/.wrangler/state",
  path.join(os.homedir(), ".config/.wrangler/state")
].filter(root => root !== undefined && root !== "");

function miniFlareDBPath() {
  const subPath = "v3/d1/miniflare-D1DatabaseObject";

  for (const root of STATE_ROOTS) {
    const candidate = path.join(root, subPath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  console.log(`unable to locate the MiniFlare DB path; tried:`);
  STATE_ROOTS.forEach(root => console.log(`    ${path.join(root, subPath)}`));
  process.exit(2);
}

/* The list of tables in the database that are worth of being dumped.
 *
 * The order given here is the order that the dump will occur in if a specific
 * table is not provided. */
 const TABLE_LIST = [
  "Game",
  "GameLoans",
  "GameMetadata",
  "GameMetadataPlacement",
  "GameExpansion",
  "GameName",
  "Household",
  "GameOwners",
  "User",
  "UserHousehold",
  "Wishlist",
  "GuestUser",
  "SessionReport",
  "SessionReportDetails",
  "SessionReportExpansions",
  "SessionReportPlayer"
]


/******************************************************************************/


/* Check the command line to see if there is a list of tables selected that we
 * should dump out. If there is, validate that they are actually tables, and if
 * so, return them all back.
 *
 * If no tables are specified, the return is the complete list of all tables
 * that are known, in dump order.
 *
 * An error is raised and the processed is whacked like Nancy Kerrigan if any
 * user supplied table is not correct, including case. */
function getDumpTableList() {
  // Get the command line arguments; any arguments that we get should be the names
  // of tables that we want to dump; So, if this list ends up empty, then just use
  // the gloval list.
  const args = process.argv.slice(2);
  const userTables = (args.length > 0) ? args : TABLE_LIST;

  // Filter the list of user tables to dump down to a list that actualyl exists.
  const dumpTables = userTables.filter(table => TABLE_LIST.indexOf(table) !== -1);
  if (dumpTables.length === 0) {
    console.log('no tables selected to dump, or table(s) specified do not exist');
    process.exit(1);
  }

  return dumpTables;
}


/******************************************************************************/


/* Find and return the full path name of the local D1 SQlite database that we
 * want to dump from. If there is no such database, this bombs the interpreter
 * like a thing that bombs out other things. */
function getSqliteDBFilename() {
  // Find where the state actually lives on this machine.
  const dbPath = miniFlareDBPath();

  // Get all of the files in the folder and trim it down to those that could be
  // database files. MiniFlare keeps its own bookkeeping database (metadata.sqlite)
  // in this folder alongside the hash named D1 object, so that one is skipped.
  const files = fs.readdirSync(dbPath).filter(
      file => file.endsWith('.sqlite') && file !== 'metadata.sqlite');

  if (files.length !== 1) {
    console.log(`cannot find DB file; require exactly 1 file in ${dbPath}`)
    process.exit(3);
  }

  return path.join(dbPath, files[0]);
}


/******************************************************************************/


/* Given a table name, dump the contents of that table out to a file in the
 * dump/SQL folder based on the name of the table itself.
 *
 * The dump goes to the untracked top level dump/ folder (gitignored, so pulled
 * out data never lands in version control); the old data/dump path was a
 * leftover from the era when this was two projects rather than one.
 *
 * The database filename and the Database table are expected to exist on entry
 * to the function. */
async function dumpDBTable(dbFileName, dbTableName) {
  const cmdLine = `echo ".dump ${dbTableName}" | sqlite3 ${dbFileName} > dump/SQL/${dbTableName}.sql`;

  // Execute it.
  const { stdout, stderr } = await exec(cmdLine);

  console.log(cmdLine);
}


/******************************************************************************/


/* Entrypoint. */
async function main() {
  // Get the database file that we are going to dump FROM and the tables that are
  // going to be the source of the dump.
  const dbFile = getSqliteDBFilename();

  // Make sure the dump target exists; it is gitignored backup storage and may
  // not have been created on a fresh checkout.
  fs.mkdirSync('dump/SQL', { recursive: true });
  const dumpTables = getDumpTableList();

  console.log(`Dumping FROM: ${dbFile}`);
  console.log(`      Tables: ${dumpTables.join(", ")}`);

  dumpTables.forEach(table => dumpDBTable(dbFile, table));
}


/******************************************************************************/

main();