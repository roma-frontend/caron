import { test, expect } from '@playwright/test';
import { login, ADMIN, SEEDED_ORDER } from './helpers';

/**
 * Mutating admin flow — toggles the seeded order's payment status. Runs only
 * against a seeded staging backend (gated on E2E_ADMIN_* creds), never on prod.
 * The seed resets the order to `awaiting`, so a toggle deterministically flips
 * it to `paid` (button shows the ✓ mark).
 */
test.describe('admin order action', () => {
  test.skip(!ADMIN.email || !ADMIN.password, 'set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD');

  test('marks the seeded order as paid', async ({ page }) => {
    await login(page, ADMIN.email!, ADMIN.password!);

    // Filter to just the seeded order via the ?q= search param.
    await page.goto(`/admin/orders?q=${encodeURIComponent(SEEDED_ORDER)}`);
    const toggle = page.getByTestId('order-payment-toggle').first();
    await expect(toggle).toBeVisible({ timeout: 20_000 });
    await expect(toggle).toContainText('○'); // starts as awaiting
    await toggle.click();
    await expect(toggle).toContainText('✓', { timeout: 15_000 }); // now paid
  });
});
