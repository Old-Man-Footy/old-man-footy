// Contact E2E: submit contact form and see success flash
import { test, expect } from '@playwright/test';

test.describe('Contact', () => {
  test('submits contact form', async ({ page }) => {
    await page.goto('/contact');

    await page.getByLabel('First Name').fill('E2E');
    await page.getByLabel('Last Name').fill('Tester');
    await page.getByLabel('Email Address').fill(`contact_${Date.now()}@example.com`);
    await page.getByLabel('Subject').selectOption('general');
    await page.getByLabel('Message').fill('This is a test message for the contact form.');

    // Ensure timestamp bot check has time to pass
    await page.waitForTimeout(2100);

    await page.getByRole('button', { name: 'Send Message' }).click();

  await expect(page).toHaveURL(/\/contact$/);

  // Expect success flash (matches layout flash partial)
  await expect(page.locator('.alert.alert-success')).toBeVisible();
  });
});
