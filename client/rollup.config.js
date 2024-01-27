import 'dotenv/config';

import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import copyStatic from '@axel669/rollup-copy-static';
import $path from '@axel669/rollup-dollar-path';

export default [
  {
    input: 'src/index.js',
    output: {
      file: `public/app.js`,
      format: 'iife',
      name: 'app',
    },
    plugins: [
      svelte({
        emitCss: false
      }),
      $path({
          root: ".",
          paths: {
            $pages: "src/pages",
            $components: "src/components",
            $lib: "src/lib"
          },
          extensions: [".js", ".mjs", ".svelte", ".jsx"]
      }),
      replace(
      {
        'preventAssignment': true,
        'process.env.GAME_API_ROOT_URI': JSON.stringify(process.env.GAME_API_ROOT_URI),
      }),
      commonjs(),
      resolve({ browser: true }),
      copyStatic("static")
    ],
  }
]
