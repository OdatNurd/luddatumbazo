import d1sql from '@odatnurd/d1-query/rollup';
import resolve from "@rollup/plugin-node-resolve"
import commonjs from '@rollup/plugin-commonjs';


/******************************************************************************/


export default {
  input: 'src/luddatumbazo.js',
  output: {
    file: 'output/main.js',
    format: 'es',
  },
  onwarn(warning, handler) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') {
      if(warning.message.includes('node_modules/hono/')) {
        return;
      }
    }
    handler(warning);
  },
  plugins: [
    commonjs(),
    resolve(),
    d1sql(),
  ]
};


/******************************************************************************/
