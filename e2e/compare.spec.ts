import { test, expect } from '@playwright/test';

/**
 * Product comparison — read-only (compare list lives in localStorage), safe
 * against production.
 */
test('a product can be added to comparison', async ({ page }) => {
  await page.goto('/products');
  await page.locator('a[href*="/products/"]').first().click();

  const cmp = page.getByTestId('compare-toggle');
  await expect(cmp).toBeVisible({ timeout: 15_000 });
  await cmp.click();

  await page.goto('/compare');
  // Non-empty comparison renders product links; empty state does not.
  await expect(page.locator('a[href*="/products/"]').first()).toBeVisible({ timeout: 15_000 });
});
