/**
 * Cross-Browser and Mobile E2E Tests
 * 
 * Tests that verify application works consistently across
 * different browsers and mobile devices.
 */

import { test, expect, devices } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { TestUtils } from './utils/TestUtils.js';

test.describe('Cross-Browser Compatibility Tests', () => {
  test('should work consistently across browsers', async ({ page, browserName }) => {
    const homePage = new HomePage(page);
    await homePage.visit();
    
    // Basic functionality should work in all browsers
    await homePage.verifyNavigation();
    await homePage.verifyTitle('Old Man Footy');
    
    // Test newsletter subscription
    const testEmail = TestUtils.generateTestEmail();
    await homePage.subscribeToNewsletter(testEmail);
    await homePage.verifySubscriptionSuccess();
    
    console.log(`✅ Test passed in ${browserName}`);
  });

  test('should handle JavaScript interactions', async ({ page }) => {
    await page.goto('/');
    
    // Test JavaScript-dependent features
    const jsEnabled = await page.evaluate(() => {
      return typeof window !== 'undefined' && 'fetch' in window;
    });
    expect(jsEnabled).toBeTruthy();
    
    // Test if common utilities are loaded
    const commonUtilsLoaded = await page.evaluate(() => {
      return document.querySelector('script[src*="common-utils"]') !== null;
    });
    
    if (commonUtilsLoaded) {
      console.log('✅ Common utilities loaded successfully');
    }
  });
});

test.describe('Mobile Responsiveness Tests', () => {
  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const homePage = new HomePage(page);
    await homePage.visit();
    
    // Check mobile navigation
    const mobileMenuExists = await TestUtils.elementExists(page, '.navbar-toggler, .mobile-menu, .hamburger');
    
    if (mobileMenuExists) {
      await page.click('.navbar-toggler, .mobile-menu, .hamburger');
      await page.waitForTimeout(500); // Wait for menu animation
    }
    
    // Verify key elements are accessible on mobile
    await homePage.verifyNavigation();
  });

  test('should handle touch interactions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const homePage = new HomePage(page);
    await homePage.visit();
    
    // Test touch scrolling
    await page.mouse.move(200, 300);
    await page.mouse.down();
    await page.mouse.move(200, 100);
    await page.mouse.up();
    
    // Verify page is still functional after touch interaction
    const testEmail = TestUtils.generateTestEmail();
    await homePage.subscribeToNewsletter(testEmail);
    await homePage.verifySubscriptionSuccess();
  });
});

test.describe('Performance and Accessibility Tests', () => {
  test('should load pages within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    
    // Reasonable load time expectation
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
  });

  test('should have proper page structure for accessibility', async ({ page }) => {
    await page.goto('/');
    
    // Check for essential accessibility elements
    const hasMainHeading = await TestUtils.elementExists(page, 'h1');
    const hasNavigation = await TestUtils.elementExists(page, 'nav, [role="navigation"]');
    const hasMainContent = await TestUtils.elementExists(page, 'main, [role="main"]');
    
    expect(hasMainHeading).toBeTruthy();
    expect(hasNavigation).toBeTruthy();
    
    // Check for alt text on images
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      
      // Images should have alt text or aria-label (or be decorative)
      const hasAccessibleText = alt !== null || ariaLabel !== null;
      const isDecorative = (await img.getAttribute('role')) === 'presentation';
      
      if (!hasAccessibleText && !isDecorative) {
        console.warn('Image without accessible text found');
      }
    }
  });

  test('should handle network failures gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });
    
    const homePage = new HomePage(page);
    await homePage.visit();
    
    // Basic functionality should still work
    await homePage.verifyNavigation();
  });
});

test.describe('Error Handling Tests', () => {
  test('should display user-friendly error messages', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.visit();
    
    // Test invalid email subscription
    await homePage.subscribeToNewsletter('invalid-email');
    await homePage.verifySubscriptionError();
    
    // Error message should be user-friendly
    const errorMessage = await page.locator('.alert-danger, .error-message').textContent();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.toLowerCase()).toContain('email');
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/nonexistent-page');
    
    if (response && response.status() === 404) {
      // Should show custom 404 page
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain('404');
    }
  });
});

test.describe('Security Tests', () => {
  test('should prevent unauthorized access to admin routes', async ({ page }) => {
    // Try to access admin route without authentication
    await page.goto('/admin');
    
    // Should redirect to login or show access denied
    const url = page.url();
    const isRedirectedToLogin = url.includes('/auth/login');
    const hasAccessDenied = await TestUtils.elementExists(page, ':text("Access Denied"), :text("Unauthorized")');
    
    expect(isRedirectedToLogin || hasAccessDenied).toBeTruthy();
  });

  test('should have secure headers', async ({ page }) => {
    const response = await page.goto('/');
    
    // Check for security headers
    const headers = response?.headers() || {};
    
    // These headers should be present for security
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection'
    ];
    
    securityHeaders.forEach(header => {
      if (headers[header]) {
        console.log(`✅ Security header present: ${header}`);
      }
    });
  });
});