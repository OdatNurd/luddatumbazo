/******************************************************************************/


import 'dotenv/config';

import commonjs from '@rollup/plugin-commonjs';
import del from 'rollup-plugin-delete';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import terser from '@rollup/plugin-terser';

import $path from '@axel669/rollup-dollar-path';
import asuid from "@axel669/asuid/node";
import copyStatic from '@axel669/rollup-copy-static';
import html from '@axel669/rollup-html-input';


/******************************************************************************/


/* Determine if this build is production or not; by default we assume that all
 * builds are not production unless they are explictly set that way. */
const production = (process.env.NODE_ENV === 'production');
console.log(`build mode: ${production ? 'production' : 'development'}`);


/******************************************************************************/


const buildList = [
  {
    // Input for the build comes from the data-main script in this HTML file;
    // both the resulting JS and the modified HTML file will be send to the
    // output.
    input: 'src/index.html',
    output: {
      file: `public/app-${asuid()}.js`,
      format: 'esm',
      sourcemap: true
    },

    // Luxon has several circular dependency warnings that the author will not
    // fix, so eat any warnings of this type specifically from that package.
    onwarn(warning, handler) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') {
        if(warning.message.includes('node_modules/luxon/')) {
          return;
        }
      }
      handler(warning);
    },

    plugins: [
      // Copy over the contents of the static folder; this happens only once
      // when running a "watch" build.
      copyStatic("static"),

      // Remove the bundled JS output to make the generated output during
      // development easier to grok.
      del({
        targets: [
          "public/app-*.js",
          "public/app-*.js.map"
        ],
        force: true
      }),

      // Do the processing that associates the input HTML with the output JS.
      html(),

      // Compile svelte components; CSS is generated out to JS code that applies
      // styles dynamically as needed.
      svelte({
        emitCss: false
      }),

      // Translate import statements in the client source to make file locations
      // less brittle.
      $path({
          root: ".",
          paths: {
            $pages: "src/pages",
            $components: "src/components",
            $stores: "src/stores",
            $lib: "src/lib",
            $api: "src/api/index.js"
          },
          extensions: [".js", ".mjs", ".svelte"]
      }),

      // Perform dynamic replacements of specific strings at build time; We use
      // this to make the code appear to be reading the environment, even though
      // it actually is not.
      replace(
      {
        'preventAssignment': true,
        'process.env.GAME_API_ROOT_URI': JSON.stringify(process.env.GAME_API_ROOT_URI),
      }),

      // Ensure that modules resolve and that the bundler knows that the output
      // is for a browser (Svelte will fail to compile files otherwise).
      commonjs(),
      resolve({ browser: true }),
    ],
  }
];


/******************************************************************************/


/* When we do production builds, all of the targets in the build list should
 * be augmented to include terser() to help minify the output, as the final
 * build step. */
if (production === true) {
  buildList.forEach(build => build.plugins.push(terser()));
}


/******************************************************************************/

export default buildList;
