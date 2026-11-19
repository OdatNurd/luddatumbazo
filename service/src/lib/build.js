/******************************************************************************/


/* The build metadata is generated under the service sources before either build
 * starts, so the worker's own watch rebuilds when it changes.
 *
 * Re-export it through the service's #lib alias so that Rollup resolves it the
 * same way as the other service modules; an exact package import such as
 * #commit is left external by the project's Rollup setup. */
export { commitReference } from '../generated/buildReference.js';


/******************************************************************************/
