import { test, expect } from '@playwright/test';

/**
 * Catalog browsing — read-only, safe against production. Favorites live in
 * localStorage; search is a client filter over the catalog.
 */
test.describe('catalog browsing', () => {
  test('search narrows the catalog and a nonsense query yields no products', async ({ page }) => {
    await page.goto('/products');
    const search = page.getByTestId('catalog-search');
    await expect(search).toBeVisible({ timeout: 15_000 });
    // A nonsense query must clear the product grid (deterministic, data-independent).
    await search.fill('zzzznomatchqueryxyz');
    await expect(page.locator('a[href*="/products/"]')).toHaveCount(0, { timeout: 15_000 });
  });

  test('a product can be added to favorites', async ({ page }) => {
    await page.goto('/products');
    const firstProduct = page.locator('a[href*="/products/"]').first();
    await expect(firstProduct).toBeVisible({ timeout: 15_000 });
    await firstProduct.click();

    const fav = page.getByTestId('favorite-toggle');
    await expect(fav).toBeVisible({ timeout: 15_000 });
    await fav.click();

    // The favorites page should now list at least one item (not the empty state).
    await page.goto('/favorites');
    await expect(page.locator('a[href*="/products/"]').first()).toBeVisible({ timeout: 15_000 });
  });
});
