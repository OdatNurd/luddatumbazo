/******************************************************************************/


/* A small HTML-entry plugin for Rollup.
 *
 * The previous plugin assumed `output.file`, but Web Awesome 3.15 now splits
 * optional icon data into dynamic chunks. Rollup requires `output.dir` for
 * multi-chunk builds, so this plugin locates the entry chunk in the generated
 * bundle and points the HTML's data-main script at it. */
import { promises as fs } from 'node:fs';
import path from 'node:path';


/******************************************************************************/


const scriptTagPattern = /<script\b[^>]*\bdata-main\b[^>]*>[\s\S]*?<\/script>/i;
const srcPattern = /\bsrc\s*=\s*(?:"[^"]*"|'[^']*')/i;


/******************************************************************************/


export function htmlEntry() {
  let htmlSource = null;
  let htmlFileName = null;

  return {
    name: 'html-entry',

    async resolveId(id) {
      if (!id.endsWith('.html')) {
        return null;
      }

      htmlSource = await fs.readFile(id, 'utf8');
      htmlFileName = path.basename(id);

      const tag = htmlSource.match(scriptTagPattern)?.[0];
      const src = tag?.match(srcPattern)?.[0];

      if (!src) {
        this.error(`HTML entry ${id} is missing a data-main script with a src attribute`);
      }

      const scriptPath = src
        .replace(/^src\s*=\s*/, '')
        .replace(/^(['"])(.*)\1$/, '$2');

      return path.resolve(path.dirname(id), scriptPath);
    },

    generateBundle(output, bundle) {
      const entry = Object.values(bundle).find(
        item => item.type === 'chunk' && item.isEntry
      );

      if (!entry) {
        this.error('Unable to find the entry chunk for the HTML output');
      }

      const html = htmlSource.replace(
        scriptTagPattern,
        tag => tag.replace(srcPattern, `src="${entry.fileName}"`)
      );

      this.emitFile({
        type: 'asset',
        fileName: htmlFileName,
        source: html
      });
    }
  };
}


/******************************************************************************/
