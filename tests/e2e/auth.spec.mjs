// Auth E2E: register then login flow
import { test, expect } from '@playwright/test';

const unique = Date.now();
const email = `e2e_${unique}@example.com`;
const password = 'Aa!23456';

test.describe('Auth', () => {
  test('registers a new user and logs in', async ({ page }) => {
    await page.goto('/auth/register');

    await page.getByLabel('First Name').fill('E2E');
    await page.getByLabel('Last Name').fill('Tester');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByLabel('Confirm Password').fill(password);
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Redirect to login with success flash
    await expect(page).toHaveURL(/\/auth\/login/);

    // Login
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    // Expect dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({ timeout: 10000 });
  });
});
