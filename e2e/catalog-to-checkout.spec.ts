import { test, expect } from '@playwright/test';

/**
 * Core purchase funnel: catalog → product → add to cart → cart → checkout.
 * Read-only: it stops at the checkout contact step and never places an order,
 * so it is safe to run against production. Cart state lives in localStorage, so
 * each fresh browser context starts empty.
 */
test('catalog → cart → checkout contact step', async ({ page }) => {
  // 1. Catalog
  await page.goto('/products');
  const firstProduct = page.locator('a[href*="/products/"]').first();
  await expect(firstProduct).toBeVisible({ timeout: 15_000 });
  await firstProduct.click();

  // 2. Product page → add to cart
  await expect(page).toHaveURL(/\/products\//);
  const addToCart = page.getByTestId('add-to-cart');
  await expect(addToCart).toBeVisible({ timeout: 15_000 });
  await addToCart.click();

  // 3. Cart → proceed to checkout
  await page.goto('/cart');
  const checkout = page.getByTestId('cart-checkout');
  await expect(checkout).toBeVisible({ timeout: 15_000 });
  await checkout.click();

  // 4. Checkout — we reached the order page (do NOT submit).
  await expect(page).toHaveURL(/\/checkout/, { timeout: 15_000 });
  // A contact input should be present on the first step.
  await expect(page.locator('input').first()).toBeVisible({ timeout: 15_000 });
});
