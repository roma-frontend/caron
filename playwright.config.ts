import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config. By default runs against the production site so no local
 * dev server / Convex backend is required — override with E2E_BASE_URL for a
 * local run (e.g. http://localhost:3000). These specs are separate from the
 * Vitest unit/integration suite (testDir `e2e/`).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://www.caron.group',
    trace: 'on-first-retry',
    locale: 'hy-AM',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
