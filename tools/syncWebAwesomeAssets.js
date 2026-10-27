/******************************************************************************/


/* Copy the Web Awesome stylesheet distribution into the client output so that
 * the UI can load the theme, native element and utility styles locally.
 *
 * The shipped theme stylesheets pull their web fonts from a remote CDN via an
 * @import at the top of the file, which we never want at runtime; the fonts are
 * vendored locally under client/static/fonts instead. As we copy, any remote
 * font import is stripped out so the output refers only to local assets. */
import path from 'path';
import { fileURLToPath } from 'url';
import jetpack from 'fs-jetpack';


/******************************************************************************/


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const source = path.join(root, 'node_modules/@awesome.me/webawesome-pro/dist/styles');
const target = path.join(root, 'output/client/styles');


/******************************************************************************/


/* Perform the copy, dropping any remote font @import statements on the way. */
export function syncStyles() {
  // Start from a clean slate so that renamed or removed upstream stylesheets
  // don't linger in the output.
  jetpack.remove(target);
  jetpack.copy(source, target, { matching: '**/*' });

  // Scrub every copied stylesheet of remote imports (fonts in themes ship with
  // an @import to a web font CDN).
  for (const file of jetpack.find(target, { matching: '*.css' })) {
    const css = jetpack.read(file);
    const cleaned = css
      .split('\n')
      .filter(line => !/@import\s+url\(\s*['"]?https?:\/\//.test(line))
      .join('\n');

    if (cleaned !== css) {
      jetpack.write(file, cleaned);
    }
  }

  console.log(`webawesome styles synced to ${path.relative(root, target)}`);
}


/******************************************************************************/


/* When run directly (node tools/syncWebAwesomeAssets.js), just do the sync. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncStyles();
}


/******************************************************************************/
