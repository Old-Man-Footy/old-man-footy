// 404 E2E: unknown route renders error page with controls
import { test, expect } from '@playwright/test';

test.describe('404 Error Page', () => {
  test('unknown route shows 404 page with navigation controls', async ({ page, baseURL }) => {
    // Navigate to a non-existent route
    await page.goto('/this-route-should-not-exist-404');

    // Expect heading "404" and message "Page Not Found"
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();

    // Buttons/links present
    await expect(page.getByRole('button', { name: 'Go Back' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse Carnivals' })).toBeVisible();

    // Click Go Home and assert redirected to base URL
    await page.getByRole('link', { name: 'Go Home' }).click();
    await expect(page).toHaveURL(new RegExp(`${baseURL}/?$`));
  });
});
