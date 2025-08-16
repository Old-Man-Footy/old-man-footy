// Homepage E2E: verifies hero, stats, upcoming carnivals list, and subscription UI
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and shows key sections', async ({ page }) => {
    await page.goto('/');
  // Expect hero title to be visible (no explicit banner role in markup)
  await expect(page.getByRole('heading', { name: 'Discover Masters Rugby League' })).toBeVisible();
  const navbar = page.getByRole('navigation');
  await expect(navbar.getByRole('link', { name: 'Find Carnivals' })).toBeVisible();
  await expect(navbar.getByRole('link', { name: 'Contact' })).toBeVisible();

  // Upcoming carnivals heading (scope to main content)
  const main = page.locator('main');
  await expect(main.getByRole('heading', { name: 'Upcoming Carnivals', exact: true })).toBeVisible();

    // Stats runner has numbers; tolerate 0 in empty DB
    await expect(page.locator('.stats-runner')).toBeVisible();

    // Subscription section present
    await expect(page.locator('#subscribe')).toBeVisible();
  });
});
