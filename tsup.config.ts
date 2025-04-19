import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'], // Entry point is inside src/
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  // Extract CSS to dist/index.css. Users will need to import it.
  injectStyle: false,
})
