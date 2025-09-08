// Auth E2E: register then login flow
import { test, expect } from '@playwright/test';

const unique = Date.now();
const email = `e2e_${unique}@example.com`;
const password = 'Aa!23456';

test.describe('Auth', () => {
  test('registers a new user and logs in', async ({ page }) => {
    // Step 1: Registration
    await page.goto('/auth/register');

    await page.getByLabel('First Name').fill('E2E');
    await page.getByLabel('Last Name').fill('Tester');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm Password').fill(password);
    
    // Click register and wait for redirect to login page
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
    
    // Verify we're on the login page and see success message
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 });

    // Step 2: Login with the newly created account
    // Clear any existing values first
    await page.getByLabel('Email Address').clear();
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password').clear(); 
    await page.getByLabel('Password').fill(password);
    
    // Click login and wait for redirect to dashboard
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Wait for either dashboard or admin dashboard (first user becomes admin)
    await page.waitForURL(/\/(admin\/)?dashboard/, { timeout: 15000 });

    // Step 3: Verify we're successfully logged in and on dashboard (regular or admin)
    await expect(page).toHaveURL(/\/(admin\/)?dashboard$/);
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible({ timeout: 10000 });
  });
});
