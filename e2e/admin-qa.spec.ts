import { test, expect } from '@playwright/test';
import { login, ADMIN } from './helpers';

/**
 * Mutating admin flow — answers the seeded pending product question. Runs only
 * against seeded staging (gated on E2E_ADMIN_* creds). The seed recreates the
 * question as pending each run, so this is repeatable.
 */
const QUESTION_TEXT = 'E2E test question about the widget';

test.describe('admin answers a question', () => {
  test.skip(!ADMIN.email || !ADMIN.password, 'set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD');

  test('publishes an answer to the seeded question', async ({ page }) => {
    await login(page, ADMIN.email!, ADMIN.password!);
    await page.goto('/admin/qa');

    // Scope to the card that contains the seeded question.
    const card = page.locator('.space-y-3 > *').filter({ hasText: QUESTION_TEXT }).first();
    await expect(card).toBeVisible({ timeout: 20_000 });

    await card.getByTestId('qa-answer-input').fill('Yes, the E2E widget fits perfectly.');
    await card.getByTestId('qa-answer-submit').click();

    // The published answer paragraph appears within the card.
    await expect(card.getByTestId('qa-answered')).toBeVisible({ timeout: 15_000 });
  });
});
