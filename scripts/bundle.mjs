// Builds single-file bundles next to tsc's output in dist/:
// - physengine.min.js       one minified ES module (import from a CDN or <script type="module">)
// - physengine.iife.min.js  a classic <script> build exposing a global `PhysEngine`
import { build } from 'esbuild';

const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  // No source maps: they would more than double the npm package (the
  // multi-file module build in dist/ keeps its maps for debugging)
  sourcemap: false,
  target: 'es2020',
  legalComments: 'none',
  logLevel: 'info',
};

await build({ ...shared, format: 'esm', outfile: 'dist/physengine.min.js' });
await build({ ...shared, format: 'iife', globalName: 'PhysEngine', outfile: 'dist/physengine.iife.min.js' });
