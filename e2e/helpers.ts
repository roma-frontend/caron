import { type Page, expect } from '@playwright/test';

/** Log in through the real UI using the seeded credentials. */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/(dashboard|admin)/, { timeout: 20_000 });
}

export const CUSTOMER = {
  email: process.env.E2E_CUSTOMER_EMAIL,
  password: process.env.E2E_CUSTOMER_PASSWORD,
};
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
};
export const SEEDED_ORDER = process.env.E2E_ORDER_NUMBER || 'E2E-0001';
export const SEEDED_COUPON = process.env.E2E_COUPON || 'E2ESALE';
/** True only under the staging config, where dev Convex has been seeded. */
export const STAGING = process.env.E2E_STAGING === '1';
