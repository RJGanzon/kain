import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Database tests: need a local Supabase (`npm run db:start`). Run with `npm run test:db`. */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./supabase/functions/_shared', import.meta.url)),
    },
  },
  test: {
    include: ['tests/db/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
