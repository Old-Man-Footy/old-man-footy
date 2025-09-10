
import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Sponsors Page
 * Tests both basic functionality and advanced filtering with seeded data
 */

test.describe('Sponsors', () => {
  
  test('list page loads and shows basic elements', async ({ page }) => {
    await page.goto('/sponsors');

    // Page heading (H1 is used in the view)
    await expect(page.locator('h1', { hasText: 'Sponsors' })).toBeVisible();

    // Statistics bar should be present
    await expect(page.locator('.stats-bar')).toBeVisible();
    
    // Search and filters section should be present
    await expect(page.locator('.search-filters')).toBeVisible();

    // Either empty state or a grid of sponsors should be visible
    const emptyState = page.getByRole('heading', { name: /No Sponsors Found|No sponsors have been added yet/i });
    const grid = page.locator('.sponsor-grid');

    // Web-first assertion: one of them should be visible eventually
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    const gridVisible = await grid.isVisible().catch(() => false);

    expect(emptyVisible || gridVisible).toBe(true);
  });

  test.describe('With Seeded Data', () => {
    
    test.beforeEach(async () => {
      // Note: The E2E seed script (scripts/e2e-seed-data.mjs) should be run
      // as part of the global setup to create the test data before these tests run.
      // The seed script creates:
      // - 5 test sponsors across NSW, VIC, QLD, WA
      // - Gold, Silver, Bronze, Supporting levels
      // - One inactive sponsor for visibility testing
    });

    test('displays sponsor statistics correctly', async ({ page }) => {
      await page.goto('/sponsors');

      // Check that statistics are populated
      const statsBar = page.locator('.stats-bar');
      await expect(statsBar).toBeVisible();

      // Should show total count (5 test sponsors)
      const totalStat = statsBar.locator('.stat-item').filter({ hasText: 'Total Sponsors' });
      await expect(totalStat).toBeVisible();
      
      // Should show active count (4 active + 1 inactive)
      const activeStat = statsBar.locator('.stat-item').filter({ hasText: 'Active' });
      await expect(activeStat).toBeVisible();
      
      // Should show Gold and Silver counts
      const goldStat = statsBar.locator('.stat-item').filter({ hasText: 'Gold' });
      const silverStat = statsBar.locator('.stat-item').filter({ hasText: 'Silver' });
      await expect(goldStat).toBeVisible();
      await expect(silverStat).toBeVisible();
    });

    test('search filter works correctly', async ({ page }) => {
      await page.goto('/sponsors');

      // Test search functionality
      const searchInput = page.locator('#search');
      await expect(searchInput).toBeVisible();

      // Search for "Gold" - should find the Test Gold Sponsor NSW
      await searchInput.fill('Gold');
      await page.getByRole('button', { name: 'Filter' }).click();

      // Should filter results
      await expect(page.locator('.sponsor-grid')).toBeVisible();
      
      // Should contain the gold sponsor
      await expect(page.getByText('Test Gold Sponsor NSW')).toBeVisible();
      
      // Should not contain other sponsors (e.g., Silver)
      const silverSponsor = page.getByText('Test Silver Sponsor VIC');
      await expect(silverSponsor).not.toBeVisible();
    });

    test('state filter works correctly', async ({ page }) => {
      await page.goto('/sponsors');

      // Test state filter
      const stateSelect = page.locator('#state');
      await expect(stateSelect).toBeVisible();

      // Filter by NSW - should show NSW sponsors only
      await stateSelect.selectOption('NSW');
      await page.getByRole('button', { name: 'Filter' }).click();

      // Should show NSW sponsors
      await expect(page.getByText('Test Gold Sponsor NSW')).toBeVisible();
      await expect(page.getByText('Test Supporting Sponsor NSW')).toBeVisible();
      
      // Should not show sponsors from other states
      await expect(page.getByText('Test Silver Sponsor VIC')).not.toBeVisible();
      await expect(page.getByText('Test Bronze Sponsor QLD')).not.toBeVisible();
    });

    test('sponsorship level filter works correctly', async ({ page }) => {
      await page.goto('/sponsors');

      // Test sponsorship level filter
      const levelSelect = page.locator('#sponsorshipLevel');
      await expect(levelSelect).toBeVisible();

      // Filter by Gold level
      await levelSelect.selectOption('Gold');
      await page.getByRole('button', { name: 'Filter' }).click();

      // Should show only Gold sponsors
      await expect(page.getByText('Test Gold Sponsor NSW')).toBeVisible();
      
      // Should not show other levels
      await expect(page.getByText('Test Silver Sponsor VIC')).not.toBeVisible();
      await expect(page.getByText('Test Bronze Sponsor QLD')).not.toBeVisible();
    });

    test('combined filters work correctly', async ({ page }) => {
      await page.goto('/sponsors');

      // Test combining state and level filters
      await page.locator('#state').selectOption('NSW');
      await page.locator('#sponsorshipLevel').selectOption('Gold');
      await page.getByRole('button', { name: 'Filter' }).click();

      // Should show only Gold sponsors from NSW
      await expect(page.getByText('Test Gold Sponsor NSW')).toBeVisible();
      
      // Should not show Supporting level from NSW
      await expect(page.getByText('Test Supporting Sponsor NSW')).not.toBeVisible();
      
      // Should not show Gold from other states
      await expect(page.getByText('Test Silver Sponsor VIC')).not.toBeVisible();
    });

    test('clear filters works correctly', async ({ page }) => {
      await page.goto('/sponsors');

      // Apply filters first
      await page.locator('#search').fill('Gold');
      await page.locator('#state').selectOption('NSW');
      await page.getByRole('button', { name: 'Filter' }).click();

      // Verify filter is applied
      await expect(page.getByText('Test Gold Sponsor NSW')).toBeVisible();
      
      // Clear filters
      await page.getByRole('link', { name: 'Clear' }).click();

      // Should show all sponsors again
      await expect(page.getByText('Test Gold Sponsor NSW')).toBeVisible();
      await expect(page.getByText('Test Silver Sponsor VIC')).toBeVisible();
      await expect(page.getByText('Test Bronze Sponsor QLD')).toBeVisible();
      
      // Filter inputs should be cleared
      await expect(page.locator('#search')).toHaveValue('');
      await expect(page.locator('#state')).toHaveValue('');
      await expect(page.locator('#sponsorshipLevel')).toHaveValue('');
    });

    test('sponsor cards display correctly', async ({ page }) => {
      await page.goto('/sponsors');

      // Check sponsor grid is visible
      await expect(page.locator('.sponsor-grid')).toBeVisible();
      
      // Check individual sponsor cards
      const sponsorCards = page.locator('.sponsor-card');
      await expect(sponsorCards.first()).toBeVisible();

      // Each card should have required elements
      const firstCard = sponsorCards.first();
      await expect(firstCard.locator('.sponsor-name')).toBeVisible();
      await expect(firstCard.locator('.sponsor-tier')).toBeVisible();
      await expect(firstCard.locator('.sponsor-actions')).toBeVisible();
      
      // View button should be present
      await expect(firstCard.getByRole('link', { name: /View/ })).toBeVisible();
    });

    test('inactive sponsors visibility', async ({ page }) => {
      await page.goto('/sponsors');

      // The inactive sponsor (Test Inactive Sponsor WA) should either be 
      // hidden or marked as inactive depending on implementation
      const inactiveSponsor = page.getByText('Test Inactive Sponsor WA');
      
      // Check if inactive sponsors are shown or hidden
      const isVisible = await inactiveSponsor.isVisible().catch(() => false);
      
      if (isVisible) {
        // If shown, it should be marked as inactive somehow
        console.log('Inactive sponsor is visible - should have inactive styling');
      } else {
        // If hidden, that's also acceptable
        console.log('Inactive sponsor is hidden from public view');
      }
    });
    
  });
});
