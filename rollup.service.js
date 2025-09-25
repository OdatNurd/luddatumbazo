import d1sql from '@odatnurd/d1-query/rollup';
import fileRoutes from "@axel669/hono-file-routes";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';

/******************************************************************************/


export default {
  input: './service/src/luddatumbazo.js',
  output: {
    file: './output/service.js',
    format: 'es',
  },
  onwarn(warning, handler) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') {
      if(warning.message.includes('node_modules/hono/') ||
         warning.message.includes('node_modules/zod/')) {
        return;
      }
    }
    handler(warning);
  },
  plugins: [
    commonjs(),
    fileRoutes({
      debug: true
    }),
    resolve(),
    d1sql(),
  ]
};


/******************************************************************************/
