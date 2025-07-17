/**
 * Base Page Object Model
 * 
 * Provides common functionality for all page objects following
 * the Page Object Model pattern for maintainable E2E tests.
 */

import { expect } from '@playwright/test';

export class BasePage {
  /**
   * Create a BasePage instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://localhost:3050';
  }

  /**
   * Navigate to a specific path with proper loading waits
   * @param {string} path - The path to navigate to
   */
  async goto(path = '/') {
    await this.page.goto(`${this.baseURL}${path}`);
    await this.page.waitForLoadState('networkidle');
    
    // Additional wait to ensure all resources and JavaScript are loaded
    await this.page.waitForTimeout(2000);
  }

  /**
   * Wait for an element to be visible with extended timeout
   * @param {string} selector - Element selector
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForElement(selector, timeout = 15000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for element to be interactive (visible and enabled)
   * @param {string} selector - Element selector
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForInteractable(selector, timeout = 15000) {
    await this.waitForElement(selector, timeout);
    await this.page.waitForSelector(`${selector}:enabled`, { timeout });
  }

  /**
   * Click an element safely with proper waits
   * @param {string} selector - Element selector
   */
  async clickElement(selector) {
    await this.waitForInteractable(selector);
    await this.page.click(selector);
    
    // Brief wait after click to allow for DOM changes
    await this.page.waitForTimeout(1000);
  }

  /**
   * Fill a form field with proper waits and validation
   * @param {string} selector - Input selector
   * @param {string} value - Value to fill
   */
  async fillField(selector, value) {
    await this.waitForInteractable(selector);
    
    // Clear existing value first
    await this.page.fill(selector, '');
    await this.page.fill(selector, value);
    
    // Wait for any validation or input processing
    await this.page.waitForTimeout(500);
  }

  /**
   * Get text content of an element
   * @param {string} selector - Element selector
   * @returns {Promise<string>} Text content
   */
  async getTextContent(selector) {
    await this.waitForElement(selector);
    return await this.page.textContent(selector);
  }

  /**
   * Check if element is visible
   * @param {string} selector - Element selector
   * @returns {Promise<boolean>} True if visible
   */
  async isVisible(selector) {
    try {
      await this.page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for page to load completely
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Take a screenshot for debugging
   * @param {string} name - Screenshot name
   */
  async takeScreenshot(name) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }

  /**
   * Verify page title
   * @param {string} expectedTitle - Expected page title
   */
  async verifyTitle(expectedTitle) {
    const title = await this.page.title();
    expect(title).toContain(expectedTitle);
  }

  /**
   * Verify URL contains expected path
   * @param {string} expectedPath - Expected URL path
   */
  async verifyURL(expectedPath) {
    const url = this.page.url();
    expect(url).toContain(expectedPath);
  }

  /**
   * Handle alerts/dialogs
   * @param {boolean} accept - Whether to accept or dismiss
   */
  async handleDialog(accept = true) {
    this.page.on('dialog', async dialog => {
      if (accept) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }
}