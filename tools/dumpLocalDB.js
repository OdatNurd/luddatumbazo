/******************************************************************************/


import fs from "fs";
import path from "path";
import util from "util";
import child_process from "child_process";

const exec = util.promisify(child_process.exec);


/******************************************************************************/


/* The path from the root of the project to the folder that holds the local copy
 * of the development D1 database; this folder must exist, and a single .sqlite
 * file must exist within it; otherwise we are, as they say, unhappy. */
const MINIFLARE_DB_PATH = "backend/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/";

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
  //
  if (fs.existsSync(MINIFLARE_DB_PATH) === false) {
    console.log(`unable to locate the MiniFlare DB path: ${MINIFLARE_DB_PATH}`);
    process.exit(2);
  }

  // Get all of the files in the folder and trim it down to those that could be
  // database files.
  const files = fs.readdirSync(MINIFLARE_DB_PATH).filter(
      file => file.endsWith('.sqlite'));

  if (files.length !== 1) {
    console.log(`cannot find DB file; require exactly 1 file in ${MINIFLARE_DB_PATH}`)
    process.exit(3);
  }

  return path.join(MINIFLARE_DB_PATH, files[0]);
}


/******************************************************************************/


/* Given a table name, dump the contents of that table out to a file in the
 * dump/SQL folder based on the name of the table itself.
 *
 * The database filename and the Database table are expected to exist on entry
 * to the function. */
async function dumpDBTable(dbFileName, dbTableName) {
  const cmdLine = `echo ".dump ${dbTableName}" | sqlite3 ${dbFileName} > data/dump/SQL/${dbTableName}.sql`;

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
  const dumpTables = getDumpTableList();

  console.log(`Dumping FROM: ${dbFile}`);
  console.log(`      Tables: ${dumpTables.join(", ")}`);

  dumpTables.forEach(table => dumpDBTable(dbFile, table));
}


/******************************************************************************/

main();