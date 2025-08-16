
// Sponsors E2E: list page loads and shows empty state when no data
import { test, expect } from '@playwright/test';

test.describe('Sponsors', () => {
  test('list page loads and shows empty state or grid', async ({ page }) => {
    await page.goto('/sponsors');

  // Page heading (H1 is used in the view)
  await expect(page.locator('h1', { hasText: 'Sponsors' })).toBeVisible();

    // Either empty state or a grid of sponsors should be visible
  const emptyState = page.getByRole('heading', { name: /No Sponsors Found|No sponsors have been added yet/i });
    const grid = page.locator('.sponsor-grid');

    // Web-first assertion: one of them should be visible eventually
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    const gridVisible = await grid.isVisible().catch(() => false);

    expect(emptyVisible || gridVisible).toBe(true);
  });
});
