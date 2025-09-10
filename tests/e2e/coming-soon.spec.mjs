import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Coming Soon Mode
 * Tests the coming soon feature when FEATURE_COMING_SOON_MODE=true
 */

test.describe('Coming Soon Mode', () => {
  
  test('should show coming soon page when feature is enabled', async ({ page }) => {
    // Set the coming soon environment variable
    // Since we can't modify environment variables in browser tests,
    // we'll test the direct route and API endpoint
    
    // Visit the coming soon page directly
    await page.goto('/coming-soon');
    
    // Check that the page loads successfully
    await expect(page).toHaveTitle(/Coming Soon - Old Man Footy/);
    
    // Check for key elements on the coming soon page
    await expect(page.getByRole('heading', { name: /Something Exciting is Coming/i })).toBeVisible();
    await expect(page.getByText(/We're putting the finishing touches on Old Man Footy/i)).toBeVisible();
    await expect(page.getByText(/your ultimate hub for Masters Rugby League/i)).toBeVisible();
    await expect(page.getByText(/Launch coming soon!/i)).toBeVisible();
  });

  test('should display contact information on coming soon page', async ({ page }) => {
    await page.goto('/coming-soon');
    
    // Check that contact information is present
    // Note: The contact email might be configurable via env vars
    const contactText = page.getByText(/support@oldmanfooty.au|contact|email/i);
    await expect(contactText.first()).toBeVisible();
  });

  test('should have proper page structure and styling', async ({ page }) => {
    await page.goto('/coming-soon');
    
    // Check basic page structure
    const mainContent = page.locator('main, .container, .coming-soon');
    await expect(mainContent.first()).toBeVisible();
    
    // Check that the page has proper styling (CSS loaded)
    const hasStyles = await page.evaluate(() => {
      const bodyStyles = window.getComputedStyle(document.body);
      return bodyStyles.margin !== '' || bodyStyles.padding !== '';
    });
    expect(hasStyles).toBeTruthy();
  });

  test('should handle social media links when present', async ({ page }) => {
    await page.goto('/coming-soon');
    
    // Check for social media links (they might not be present in test env)
    const socialLinks = page.locator('a[href*="facebook"], a[href*="instagram"], a[href*="twitter"]');
    const socialCount = await socialLinks.count();
    
    if (socialCount > 0) {
      // If social links exist, they should open in new tab/window
      for (let i = 0; i < socialCount; i++) {
        const link = socialLinks.nth(i);
        const target = await link.getAttribute('target');
        expect(target).toBe('_blank');
      }
    }
  });

  test('should provide API endpoint for coming soon status', async ({ page }) => {
    // Test the API endpoint for coming soon status
    const response = await page.request.get('/api/coming-soon/status');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('comingSoonMode');
    expect(data).toHaveProperty('message');
    expect(typeof data.comingSoonMode).toBe('boolean');
    expect(typeof data.message).toBe('string');
  });

  test('should redirect to home when coming soon mode is disabled', async ({ page }) => {
    // First check the current status
    const statusResponse = await page.request.get('/api/coming-soon/status');
    const statusData = await statusResponse.json();
    
    if (!statusData.comingSoonMode) {
      // If coming soon mode is disabled, /coming-soon should redirect to home
      const response = await page.request.get('/coming-soon', {
        maxRedirects: 0
      });
      
      // Should be a redirect (3xx) or the final home page (200)
      expect([200, 301, 302, 303, 307, 308]).toContain(response.status());
      
      // If it's a redirect, it should go to home
      if (response.status() >= 300 && response.status() < 400) {
        const location = response.headers()['location'];
        expect(location).toBe('/');
      }
    }
  });

  test('should allow access to static assets during coming soon mode', async ({ page }) => {
    // Test that CSS and JS assets are accessible
    // This is important for the coming soon page to display properly
    
    // Navigate to coming soon page first
    await page.goto('/coming-soon');
    
    // Check that CSS is loaded by examining computed styles
    const hasStylesheet = await page.evaluate(() => {
      return document.styleSheets.length > 0;
    });
    expect(hasStylesheet).toBeTruthy();
  });

  test('should be accessible with proper semantic structure', async ({ page }) => {
    await page.goto('/coming-soon');
    
    // Check for proper semantic HTML structure
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    
    // Check that the page has proper document structure
    const docTitle = await page.title();
    expect(docTitle).toBeTruthy();
    expect(docTitle.length).toBeGreaterThan(0);
  });

});
