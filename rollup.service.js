import d1sql from '@odatnurd/d1-query/rollup';
import fileRoutes from "@axel669/hono-file-routes";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';

/******************************************************************************/


/* hono-file-routes classifies a route file as "static" only when its whole
 * pattern has no [param] segments, so a static sibling of a parametrized route
 * (e.g. game/meta/[metaType]/list.js next to game/meta/[metaType]/[idOrSlug].js)
 * lands in the "params" bucket and is registered in glob scan order. Because
 * Hono matches the first registered route, the dynamic one then shadows the
 * static ones.
 *
 * The library already registers the buckets themselves in the right order
 * (middleware, static, params, wildcard); this wrapper fixes the order within
 * each bucket so that routes whose final segment is static win over routes
 * whose final segment is dynamic, which is the specificity Hono lacks. */
function routeOrder(plugin) {
  // Pull the route pattern out of a generated addRoute() call.
  const routePath = line => (line.match(/addRoute\("([^"]*)"/) ?? ['', ''])[1];

  // How "dynamic" a route is: bucket first (middleware, static, params,
  // wildcard), then static tail before dynamic tail, then fewer param segments,
  // then the path itself for a stable, deterministic order.
  const weight = line => {
    const type = (line.match(/"(middleware|static|params|wildcard)"\s*\)/) ?? [])[1] ?? 'wildcard';
    const path = routePath(line);
    const segments = path.split('/');
    const lastSegment = segments.at(-1) ?? '';
    const paramCount = segments.filter(seg => seg.startsWith(':') || seg === '*').length;

    const tier = { middleware: 0, static: 1, params: 2, wildcard: 3 }[type];
    const tailIsDynamic = (lastSegment.startsWith(':') || lastSegment === '*') ? 1 : 0;

    return [tier, tailIsDynamic, paramCount, path];
  };

  return {
    ...plugin,

    async load(file) {
      const code = await plugin.load.call(this, file);
      if (typeof code !== 'string' || code.includes('addRoute(') === false) {
        return code;
      }

      const lines = code.split('\n');

      // Reorder each contiguous run of addRoute() registrations.
      let index = 0;
      while (index < lines.length) {
        if (lines[index].startsWith('addRoute(') === false) {
          index += 1;
          continue;
        }

        let end = index;
        while (end < lines.length && lines[end].startsWith('addRoute(')) {
          end += 1;
        }

        const block = lines.slice(index, end);
        block.sort((a, b) => {
          const left = weight(a);
          const right = weight(b);

          for (let i = 0; i < left.length; i++) {
            if (left[i] !== right[i]) {
              return (left[i] < right[i]) ? -1 : 1;
            }
          }

          return 0;
        });

        lines.splice(index, block.length, ...block);
        index = end;
      }

      return lines.join('\n');
    }
  };
}

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
    routeOrder(fileRoutes({
      debug: true
    })),
    resolve(),
    d1sql(),
  ]
};


/******************************************************************************/
