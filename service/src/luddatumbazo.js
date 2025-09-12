/******************************************************************************/

/* Our Hono application is constructed dynamically bh the file route plugin,
 * which scvans for the files and folder in the ./routes folder and converts to
 * a standard Hono all. */
export {  default } from 'file-routes@./routes';

/******************************************************************************/
