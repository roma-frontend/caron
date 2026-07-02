import { test, expect } from '@playwright/test';
import { STAGING } from './helpers';

/**
 * Full order placement end-to-end (mutating) — catalog → cart → checkout →
 * place order → order-success. Creates a real order, so it runs only under the
 * seeded staging config against dev Convex (where notifications are silenced via
 * NOTIFICATIONS_DISABLED). Handles both pickup and delivery-zone checkout
 * variants so it works regardless of the dev store settings.
 */
test.describe('order placement', () => {
  test.skip(!STAGING, 'runs only under the seeded staging config');

  test('places an order and reaches the success page', async ({ page }) => {
    // Add a product to the cart.
    await page.goto('/products');
    await page.locator('a[href*="/products/"]').first().click();
    await page.getByTestId('add-to-cart').click();
    await page.goto('/cart');
    await page.getByTestId('cart-checkout').click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 15_000 });

    // Step 1 — contact info.
    await page.getByTestId('checkout-name').fill('E2E Buyer');
    await page.getByTestId('checkout-phone').fill('+37411223344');
    await page.getByTestId('checkout-email').fill('e2e-buyer@caron.test');
    await page.getByTestId('checkout-submit').click();

    // Step 2 — delivery: prefer pickup; otherwise fill address + pick a zone.
    const pickup = page.getByTestId('pickup-toggle');
    if (await pickup.count()) {
      await pickup.check();
    } else {
      await page.getByTestId('checkout-address').fill('E2E Street 1, Yerevan');
      await page.getByTestId('zone-select').click();
      await page.getByRole('option').first().click();
    }
    await page.getByTestId('checkout-submit').click();

    // Step 3 — confirm: agree (this waits for the confirm step to render),
    // pick a payment method if the store requires one, then place the order.
    await page.getByTestId('checkout-agree').check();
    const payment = page.getByTestId('payment-option');
    if (await payment.count()) await payment.first().click();
    const submit = page.getByTestId('checkout-submit');
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.click();

    // Landed on the order-success page.
    await expect(page).toHaveURL(/\/order-success/, { timeout: 20_000 });
  });
});
