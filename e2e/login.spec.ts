import { test, expect } from '@playwright/test';

/**
 * Login flow — read-only. Exercises the form and the failure path with bogus
 * credentials (a rejected login mutates nothing), so it is safe against prod.
 */
test.describe('login', () => {
  test('rejects invalid credentials with an error', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill(`nobody+${Date.now()}@example.com`);
    await page.getByTestId('login-password').fill('definitely-wrong-password');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 15_000 });
    // Still on the login page — no redirect happened.
    await expect(page).toHaveURL(/\/login/);
  });

  test('has a link to registration', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('a[href*="/register"]').first()).toBeVisible({ timeout: 15_000 });
  });
});

/**
 * Authenticated smoke — read-only. Skipped unless E2E_TEST_EMAIL /
 * E2E_TEST_PASSWORD are provided (e.g. a dedicated throw-away account), so it
 * never runs with credentials it doesn't have. It only logs in and verifies the
 * post-login area renders; it performs no mutating actions (order status,
 * returns, etc. stay covered by the convex-test integration suite to avoid
 * touching live data).
 */
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

test.describe('authenticated area', () => {
  test.skip(!email || !password, 'set E2E_TEST_EMAIL / E2E_TEST_PASSWORD to run');

  test('logs in and lands on an authenticated page', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill(email!);
    await page.getByTestId('login-password').fill(password!);
    await page.getByTestId('login-submit').click();
    // Customers land on /dashboard, staff on /admin.
    await expect(page).toHaveURL(/\/(dashboard|admin)/, { timeout: 20_000 });
    await expect(page.getByTestId('login-error')).toHaveCount(0);
  });
});
