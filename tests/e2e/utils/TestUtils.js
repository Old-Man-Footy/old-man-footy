/**
 * E2E Test Utilities
 * 
 * Common utilities and helper functions for E2E tests
 */

import { expect } from '@playwright/test';

export class TestUtils {
  /**
   * Generate a unique test email
   * @returns {string} Unique email address
   */
  static generateTestEmail() {
    return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  }

  /**
   * Generate a unique test name
   * @returns {string} Unique name
   */
  static generateTestName() {
    return `Test User ${Date.now()}`;
  }

  /**
   * Wait for API response
   * @param {Page} page - Playwright page object
   * @param {string} url - URL pattern to wait for
   * @param {number} timeout - Timeout in milliseconds
   */
  static async waitForAPI(page, url, timeout = 10000) {
    await page.waitForResponse(response => 
      response.url().includes(url) && response.status() === 200,
      { timeout }
    );
  }

  /**
   * Clear local storage and cookies
   * @param {Page} page - Playwright page object
   */
  static async clearBrowserData(page) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
  }

  /**
   * Take screenshot with timestamp
   * @param {Page} page - Playwright page object
   * @param {string} name - Screenshot name
   */
  static async takeTimestampedScreenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Fill form with data
   * @param {Page} page - Playwright page object
   * @param {Object} formData - Form data object
   */
  static async fillForm(page, formData) {
    for (const [selector, value] of Object.entries(formData)) {
      await page.fill(selector, value);
    }
  }

  /**
   * Wait for element to be visible and enabled
   * @param {Page} page - Playwright page object
   * @param {string} selector - Element selector
   * @param {number} timeout - Timeout in milliseconds
   */
  static async waitForInteractable(page, selector, timeout = 10000) {
    await page.waitForSelector(selector, { 
      state: 'visible', 
      timeout 
    });
    await page.waitForSelector(selector, { 
      state: 'attached', 
      timeout 
    });
    await expect(page.locator(selector)).toBeEnabled();
  }

  /**
   * Check if element exists without throwing error
   * @param {Page} page - Playwright page object
   * @param {string} selector - Element selector
   * @returns {Promise<boolean>} True if element exists
   */
  static async elementExists(page, selector) {
    try {
      await page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retry operation with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} baseDelay - Base delay in milliseconds
   */
  static async retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
      }
    }
  }

  /**
   * Check network connectivity
   * @param {Page} page - Playwright page object
   * @returns {Promise<boolean>} True if connected
   */
  static async checkNetworkConnectivity(page) {
    try {
      const response = await page.request.get('/health');
      return response.ok();
    } catch {
      return false;
    }
  }

  /**
   * Mock API response
   * @param {Page} page - Playwright page object
   * @param {string} url - URL pattern to mock
   * @param {Object} responseData - Mock response data
   */
  static async mockAPI(page, url, responseData) {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }

  /**
   * Test data cleanup helper
   * @param {Function} cleanupFunction - Cleanup function to execute
   */
  static createCleanupHandler(cleanupFunction) {
    return async () => {
      try {
        await cleanupFunction();
      } catch (error) {
        console.warn('Cleanup failed:', error.message);
      }
    };
  }
}