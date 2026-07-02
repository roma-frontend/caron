import { defineConfig } from 'vitest/config';
import path from 'node:path';

// convex-test requires the edge-runtime environment; pure unit tests run fine
// there too, so we use it globally. `@` maps to ./src for frontend imports.
export default defineConfig({
  test: {
    environment: 'edge-runtime',
    include: ['convex/**/*.test.ts', 'src/**/*.test.ts', 'tests/**/*.test.ts'],
    server: { deps: { inline: ['convex-test'] } },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
