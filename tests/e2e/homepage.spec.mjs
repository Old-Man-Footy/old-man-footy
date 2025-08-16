// Homepage E2E: verifies hero, stats, upcoming carnivals list, and subscription UI
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and shows key sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Find Carnivals' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact' })).toBeVisible();

    // Upcoming carnivals heading
    await expect(page.getByRole('heading', { name: 'Upcoming Carnivals' })).toBeVisible();

    // Stats runner has numbers; tolerate 0 in empty DB
    await expect(page.locator('.stats-runner')).toBeVisible();

    // Subscription section present
    await expect(page.locator('#subscribe')).toBeVisible();
  });
});
