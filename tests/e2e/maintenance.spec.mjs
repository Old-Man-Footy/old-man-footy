// Maintenance mode E2E: FEATURE_MAINTENANCE_MODE=true shows maintenance page
import { test, expect } from '@playwright/test';

// Important: Playwright webServer env is set from config; this spec assumes
// FEATURE_MAINTENANCE_MODE can be overridden per run only if config/env allow it.
// Given the config sets FEATURE_MAINTENANCE_MODE=false, we validate the dedicated page and API status.

test.describe('Maintenance Mode', () => {
  test('maintenance landing route shows maintenance page when enabled', async ({ page }) => {
    // Navigate directly to /maintenance; router redirects to / if flag is false
    await page.goto('/maintenance');

    const isEnabled = process.env.FEATURE_MAINTENANCE_MODE === 'true';
    if (isEnabled) {
      // Expect 503-like page content (controller sets 503 status; UI content visible)
      await expect(page.getByRole('heading', { name: 'Site Maintenance - Old Man Footy' })).toBeVisible({ timeout: 5000 });
    } else {
      // When disabled, the route redirects to home
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test('maintenance API status endpoint reflects mode', async ({ request }) => {
    const res = await request.get('/api/maintenance/status');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('maintenanceMode');
    expect(typeof json.maintenanceMode).toBe('boolean');
  });
});
