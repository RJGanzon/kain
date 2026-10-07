import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3100);

const PHONE = {
  ...devices['Desktop Chrome'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // Leave CPU for the app server and local Supabase.
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'phone',
      testIgnore: /perf\.spec\.ts/,
      use: PHONE,
    },
    {
      // Timing runs alone, after everything else, so other tests don't skew it.
      name: 'perf',
      testMatch: /perf\.spec\.ts/,
      dependencies: ['phone'],
      use: PHONE,
    },
  ],
  webServer: {
    // Production build: prefetching and transitions behave as they will on Vercel.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
