/******************************************************************************/


/* Given some information on where and what database action is taken, what the
 * result was, and whether or not it is a batch, display a log that displays
 * details of the operation. */
const displayDBResultLog = (where, action, result, isBatch) => {
  // The locus that this operation happened at.
  const locus = `${where}:${action}`;

  // Alias the result meta section for easier access
  const m = result.meta;

  // When the log is the result of a batch, we want a bit of a visual separation
  // in the output to show that.
  const sep = isBatch ? '  =>' : '';

  // Gather the duration of the operation, whether or not i was a success, and
  // some information on the underlying data.
  //
  // Since Cloudflare are dicks, the result set doesn't match the docs when you
  // do local dev, so we need to patch that in so that stuff doesn't blow up in
  // our faces.
  const duration = `[${m.duration}ms]`;
  const status = `${result.success ? 'success' : 'failure'}`;
  const stats = `last_row_id=${m.last_row_id}, reads=${m.rows_read ?? '?'}, writes=${m.rows_written ?? '?'}`

  // Gather the size of the result set; this can be null, in which case report
  // that instead.
  const count = `, resultSize=${result.results !== null ? result.results.length : 'null'}`
  console.log(`${duration} ${sep} ${locus} : ${m.served_by}(${status}) : ${stats}${count}`);
}


/******************************************************************************/


/* This helper plucks the results out of a D1 result set and returns them while
 * also making a log entry on the number of reads and writes to the database,
 * as well as whether the operation succeeded or failed and how long it took.
 *
 * The results parameter is the result of calling one of:
 *   run(), all() or batch()
 *
 * This call will detect if the results passed in is an array or not; if it is,
 * then it's assumed this is being used to report the output of a batched call,
 * in which case the returned result is a mapped version that provides an array
 * of results. */
export const getDBResult = (where, action, resultSet) => {
  // If the result set is an array, then this is a batch operation, so we need
  // to generate a log once for each item in the batch, and then adjust the
  // result set so that it's an array of results and not an array of D1 info
  if (Array.isArray(resultSet)) {
    for (const item of resultSet) {
      displayDBResultLog(where, action, item, true);
    }

    // Unfold the results on return
    return resultSet.map(item => item.results);
  }

  // Just a single result set, so log it and return the inner results back.
  displayDBResultLog(where, action, resultSet, false);
  return resultSet.results;
}


/******************************************************************************/
