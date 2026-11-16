/******************************************************************************/


/* The build metadata is generated at the repository root before either build
 * starts. Re-export it through the service's #lib alias so that Rollup resolves
 * it the same way as the other service modules; an exact package import such as
 * #commit is left external by the project's Rollup setup. */
export { commitReference } from '../../../commitReference.js';


/******************************************************************************/
