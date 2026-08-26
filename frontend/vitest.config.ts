import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Separate from vite.config.ts deliberately — the React Router + Tailwind
// vite plugins there are geared around the app build/dev server, not a test
// runner, so this keeps just what Vitest needs: the same `~/` -> `app/`
// path alias tsconfig.json declares, resolved manually since this config
// doesn't load `vite-tsconfig-paths`.
export default defineConfig({
  resolve: {
    alias: {
      '~': path.resolve(dirname, './app'),
    },
  },
  test: {
    environment: 'node',
  },
});
