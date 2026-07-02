import { test, expect } from '@playwright/test';
import { login, CUSTOMER } from './helpers';

/**
 * Mutating customer flow — creates a real return request. Runs only against a
 * seeded staging backend (gated on E2E_CUSTOMER_* creds), never on prod. The
 * seed resets the order + clears open returns so the run is repeatable.
 */
test.describe('customer return', () => {
  test.skip(!CUSTOMER.email || !CUSTOMER.password, 'set E2E_CUSTOMER_EMAIL / E2E_CUSTOMER_PASSWORD');

  test('creates a return request for the seeded order', async ({ page }) => {
    await login(page, CUSTOMER.email!, CUSTOMER.password!);

    await page.goto('/orders');
    const openBtn = page.getByTestId('return-open').first();
    await expect(openBtn).toBeVisible({ timeout: 15_000 });
    await openBtn.click();

    // Modal opens with items pre-selected; submit as-is.
    const submit = page.getByTestId('return-submit');
    await expect(submit).toBeVisible({ timeout: 10_000 });
    await submit.click();

    // The order row now shows the return status instead of the open button.
    await expect(page.getByTestId('return-status').first()).toBeVisible({ timeout: 15_000 });
  });
});
