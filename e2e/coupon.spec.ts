import { test, expect } from '@playwright/test';
import { SEEDED_COUPON, STAGING } from './helpers';

/**
 * Applying a coupon at checkout shows the discount. Read-only (no order placed)
 * but depends on the seeded E2ESALE coupon, so it runs only under the staging
 * config against seeded dev Convex.
 */
test.describe('coupon at checkout', () => {
  test.skip(!STAGING, 'runs only under the seeded staging config');

  test('a valid coupon shows a discount line', async ({ page }) => {
    // Add a product to the cart.
    await page.goto('/products');
    await page.locator('a[href*="/products/"]').first().click();
    await page.getByTestId('add-to-cart').click();

    // Go to checkout.
    await page.goto('/cart');
    await page.getByTestId('cart-checkout').click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 15_000 });

    // Enter the seeded coupon → a discount line appears.
    const coupon = page.getByTestId('coupon-input');
    await expect(coupon).toBeVisible({ timeout: 15_000 });
    await coupon.fill(SEEDED_COUPON);
    await expect(page.getByTestId('coupon-discount')).toBeVisible({ timeout: 15_000 });
  });
});
