import { defineConfig, devices } from '@playwright/test';

/**
 * Staging E2E config: runs the app locally (`next dev`) against the *dev* Convex
 * deployment (from .env.local) and executes the full suite INCLUDING the
 * mutating specs (customer return, admin order action) using the seeded
 * throw-away accounts. Never point this at production.
 *
 *   npm run e2e:staging   (seeds dev Convex, then runs)
 */

// Seeded credentials (see convex/e2e.ts). Defaults let the mutating specs run
// out of the box; override via env for a different account.
process.env.E2E_CUSTOMER_EMAIL ??= 'e2e-customer@caron.test';
process.env.E2E_CUSTOMER_PASSWORD ??= 'E2ePass123!';
process.env.E2E_ADMIN_EMAIL ??= 'e2e-admin@caron.test';
process.env.E2E_ADMIN_PASSWORD ??= 'E2ePass123!';
process.env.E2E_ORDER_NUMBER ??= 'E2E-0001';

const PORT = Number(process.env.E2E_PORT || 3000);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // mutating specs share the seeded order — keep serial
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    locale: 'hy-AM',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
