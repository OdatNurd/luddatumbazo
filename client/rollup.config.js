import 'dotenv/config';

import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import copyStatic from '@axel669/rollup-copy-static';
import html from '@axel669/rollup-html-input';
import $path from '@axel669/rollup-dollar-path';

import asuid from "@axel669/asuid/node";

export default [
  {
    input: 'src/index.html',
    output: {
      file: `public/app-${asuid()}.js`,
      format: 'iife',
      name: 'app',
    },
    plugins: [
      html(),
      svelte({
        emitCss: false
      }),
      $path({
          root: ".",
          paths: {
            $pages: "src/pages",
            $components: "src/components",
            $stores: "src/stores",
            $lib: "src/lib",
            $api: "src/api/index.js"
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
