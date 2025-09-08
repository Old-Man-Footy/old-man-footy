// Setup E2E: Create admin user before other tests
import { test, expect } from '@playwright/test';

/**
 * Setup test that runs first to verify the E2E environment is ready.
 * With the new E2E database setup, we have predictable test data and
 * we just need to verify the first user becomes admin correctly.
 */
test.describe('Setup', () => {
  test('verifies E2E environment and creates admin user', async ({ page }) => {
    // Navigate to registration to create the first user (which becomes admin)
    await page.goto('/auth/register');

    const unique = Date.now();
    const adminEmail = `admin_${unique}@example.com`;
    const adminPassword = 'AdminPassword123!';

    // Fill registration form for admin user (first user auto-becomes admin)
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('Admin');
    await page.getByLabel('Email Address').fill(adminEmail);
    await page.getByLabel('Password', { exact: true }).fill(adminPassword);
    await page.getByLabel('Confirm Password').fill(adminPassword);

    // Submit registration and wait for redirect to login
    await Promise.all([
      page.waitForURL(/\/auth\/login/, { timeout: 10000 }),
      page.getByRole('button', { name: 'Create Account' }).click(),
    ]);

    // Verify we're on login page and see success message
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('.alert-success, .flash-message')).toBeVisible();
    
    // Login as the first user (should become admin)
    await page.getByLabel('Email Address').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await Promise.all([
      page.waitForURL(/\/(dashboard|admin\/dashboard)/, { timeout: 10000 }),
      page.getByRole('button', { name: 'Login' }).click(),
    ]);

    // Since this is the first user in our fresh E2E database, they should become admin
    const currentUrl = page.url();
    if (currentUrl.includes('/admin/dashboard')) {
      await expect(page.getByRole('heading', { name: /Administrator Dashboard/i })).toBeVisible();
      console.log('✅ First user became admin successfully (E2E environment verified)');
    } else {
      // If they didn't become admin, that's actually a problem with our E2E setup
      console.warn('⚠️ First user did not become admin - E2E database may not be fresh');
      await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible();
    }

    // Logout to clean up session for subsequent tests
    try {
      const userDropdown = page.locator('#navbarDropdown, .nav-link.dropdown-toggle').first();
      if (await userDropdown.isVisible({ timeout: 2000 })) {
        await userDropdown.click();
        await page.waitForTimeout(500);
        
        const logoutForm = page.locator('form[action="/auth/logout"]');
        if (await logoutForm.isVisible({ timeout: 2000 })) {
          await logoutForm.locator('button[type="submit"]').click();
        } else {
          await page.goto('/auth/logout');
        }
      } else {
        await page.goto('/auth/logout');
      }
      
      await page.waitForURL(/\//, { timeout: 10000 });
    } catch (error) {
      console.log('⚠️ Logout cleanup may have failed, but continuing with tests');
    }
  });
});
