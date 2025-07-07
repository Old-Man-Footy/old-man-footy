/**
 * Home Page Object
 * 
 * Page object for the homepage with methods for interacting
 * with homepage elements and functionality.
 */

import { BasePage } from './BasePage.js';
import { expect } from '@playwright/test';

export class HomePage extends BasePage {
  /**
   * Create a HomePage instance
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  constructor(page) {
    super(page);
    
    // Selectors following project's security-first approach
    this.selectors = {
      pageTitle: 'h1',
      navigation: 'nav',
      carnivalsLink: 'a[href="/carnivals"]',
      clubsLink: 'a[href="/clubs"]',
      sponsorsLink: 'a[href="/sponsors"]',
      loginLink: 'a[href="/auth/login"]',
      registerLink: 'a[href="/auth/register"]',
      subscribeForm: 'form[action="/subscribe"]',
      emailInput: 'input[name="email"]',
      subscribeButton: 'button[type="submit"]',
      successMessage: '.alert-success',
      errorMessage: '.alert-danger',
      loadingIndicator: '.loading, .spinner'
    };
  }

  /**
   * Navigate to homepage and wait for complete loading including CSS
   */
  async visit() {
    console.log('🔄 Navigating to homepage...');
    await this.goto('/');
    
    // Wait for page to load completely
    await this.page.waitForLoadState('networkidle');
    console.log('📡 Network idle state reached');
    
    // Wait for CSS to load by checking for specific styled elements
    try {
      await this.page.waitForFunction(() => {
        const nav = document.querySelector('nav');
        if (!nav) return false;
        const computedStyle = window.getComputedStyle(nav);
        return computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
               computedStyle.backgroundColor !== 'transparent';
      }, { timeout: 10000 });
      console.log('🎨 CSS styles loaded successfully');
    } catch {
      console.log('⚠️  CSS may not be fully loaded, continuing...');
    }
    
    // Wait for any loading indicators to disappear
    try {
      await this.page.waitForSelector(this.selectors.loadingIndicator, { 
        state: 'hidden', 
        timeout: 5000 
      });
      console.log('⏳ Loading indicators cleared');
    } catch {
      console.log('ℹ️  No loading indicators found');
    }
    
    // Ensure main content is visible
    await this.waitForElement(this.selectors.pageTitle);
    console.log('📄 Main title element found');
    
    // Additional wait for JavaScript initialization
    await this.page.waitForTimeout(3000);
    console.log('⚡ JavaScript initialization wait completed');
    
    await this.verifyTitle('Old Man Footy');
    console.log('✅ Homepage visit completed successfully');
  }

  /**
   * Navigate to carnivals page
   */
  async goToCarnivals() {
    await this.clickElement(this.selectors.carnivalsLink);
    await this.verifyURL('/carnivals');
  }

  /**
   * Navigate to clubs page
   */
  async goToClubs() {
    await this.clickElement(this.selectors.clubsLink);
    await this.verifyURL('/clubs');
  }

  /**
   * Navigate to sponsors page
   */
  async goToSponsors() {
    await this.clickElement(this.selectors.sponsorsLink);
    await this.verifyURL('/sponsors');
  }

  /**
   * Navigate to login page
   */
  async goToLogin() {
    await this.clickElement(this.selectors.loginLink);
    await this.verifyURL('/auth/login');
  }

  /**
   * Navigate to register page
   */
  async goToRegister() {
    await this.clickElement(this.selectors.registerLink);
    await this.verifyURL('/auth/register');
  }

  /**
   * Subscribe to newsletter with proper state selection handling
   * @param {string} email - Email address to subscribe
   * @param {string[]} states - Array of states to subscribe to (defaults to ['NSW'])
   */
  async subscribeToNewsletter(email, states = ['NSW']) {
    console.log(`📧 Starting newsletter subscription for: ${email}`);
    console.log(`🗺️  States to select: ${states.join(', ')}`);
    
    // Wait for the subscribe form to be ready
    await this.waitForElement(this.selectors.subscribeForm);
    await this.waitForElement(this.selectors.emailInput);
    console.log('📝 Subscribe form elements found');
    
    // Clear any existing value and fill email
    await this.page.fill(this.selectors.emailInput, '');
    await this.page.fill(this.selectors.emailInput, email);
    console.log('✉️  Email field filled');
    
    // Handle state selection
    await this.selectStates(states);
    
    // Add hidden form timestamp for bot protection (following project security requirements)
    await this.page.evaluate(() => {
      const form = document.querySelector('form[action="/subscribe"]');
      if (form) {
        // Add or update form timestamp for bot protection
        let timestampInput = form.querySelector('input[name="form_timestamp"]');
        if (!timestampInput) {
          timestampInput = document.createElement('input');
          timestampInput.type = 'hidden';
          timestampInput.name = 'form_timestamp';
          form.appendChild(timestampInput);
        }
        timestampInput.value = (Date.now() - 5000).toString(); // 5 seconds ago
        
        // Ensure honeypot field is empty (security measure)
        let websiteInput = form.querySelector('input[name="website"]');
        if (!websiteInput) {
          websiteInput = document.createElement('input');
          websiteInput.type = 'hidden';
          websiteInput.name = 'website';
          websiteInput.style.display = 'none';
          form.appendChild(websiteInput);
        }
        websiteInput.value = ''; // Must be empty for legitimate users
      }
    });
    console.log('🔒 Security fields added to form');
    
    // Wait for submit button to be clickable
    await this.waitForInteractable(this.selectors.subscribeButton);
    console.log('🎯 Submit button ready');
    
    // Submit the form using native form submission to ensure proper encoding
    await this.page.evaluate(() => {
      const form = document.querySelector('form[action="/subscribe"]');
      if (form) {
        // Ensure form has proper encoding for Express.js
        form.method = 'POST';
        form.enctype = 'application/x-www-form-urlencoded';
        form.submit();
      }
    });
    console.log('📤 Form submitted with proper encoding');
    
    // Wait for form submission to complete
    await this.page.waitForLoadState('networkidle');
    
    // Additional wait for any flash messages to appear
    await this.page.waitForTimeout(2000);
    console.log('⏰ Post-submission wait completed');
  }

  /**
   * Select states for newsletter subscription
   * @param {string[]} states - Array of states to select
   */
  async selectStates(states) {
    console.log(`🗺️  Selecting states: ${states.join(', ')}`);
    
    // First, look for the state selector dropdown/toggle button
    const stateToggleSelectors = [
      'button:has-text("Choose states")',
      '.state-selector-toggle',
      'button[data-bs-toggle="dropdown"]:has-text("states")',
      '.state-toggle'
    ];
    
    let stateToggle = null;
    for (const selector of stateToggleSelectors) {
      try {
        stateToggle = await this.page.locator(selector).first();
        if (await stateToggle.isVisible()) {
          console.log(`🎯 Found state toggle with selector: ${selector}`);
          break;
        }
      } catch {
        continue;
      }
    }
    
    if (stateToggle && await stateToggle.isVisible()) {
      // Click to open the state selector dropdown
      await stateToggle.click();
      console.log('📋 State selector dropdown opened');
      
      // Wait for dropdown to be visible
      await this.page.waitForTimeout(500);
    }
    
    // Now select the specified states
    for (const state of states) {
      const stateCheckboxSelectors = [
        `input[name="state"][value="${state}"]`,
        `input[name="states"][value="${state}"]`,
        `input[type="checkbox"][value="${state}"]`,
        `.state-checkbox[value="${state}"]`
      ];
      
      let stateSelected = false;
      for (const selector of stateCheckboxSelectors) {
        try {
          const checkbox = this.page.locator(selector);
          if (await checkbox.isVisible()) {
            await checkbox.check();
            console.log(`✅ Selected state: ${state} using selector: ${selector}`);
            stateSelected = true;
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (!stateSelected) {
        console.log(`⚠️  Could not find checkbox for state: ${state}`);
      }
    }
    
    // Close the dropdown if it was opened
    if (stateToggle && await stateToggle.isVisible()) {
      try {
        // Click elsewhere to close or click the toggle again
        await this.page.click('body');
        await this.page.waitForTimeout(500);
        console.log('📋 State selector dropdown closed');
      } catch {
        console.log('ℹ️  Dropdown may have closed automatically');
      }
    }
  }

  /**
   * Wait for element to be interactive
   * @param {string} selector - Element selector
   */
  async waitForInteractable(selector) {
    await this.waitForElement(selector);
    await this.page.waitForSelector(selector + ':enabled', { timeout: 10000 });
  }

  /**
   * Verify subscription success message appears
   */
  async verifySubscriptionSuccess() {
    console.log('🔍 Checking for success message...');
    
    // Wait for either success or error message to appear after redirect
    await this.page.waitForSelector('.alert', { timeout: 10000 });
    
    // Check for success message specifically
    const successMessage = await this.page.locator('.alert.alert-success');
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    const message = await successMessage.textContent();
    expect(message.toLowerCase()).toContain('subscribed');
    
    console.log('✅ Success message verified:', message.trim());
  }

  /**
   * Verify error message appears
   */
  async verifySubscriptionError() {
    console.log('🔍 Checking for error message...');
    
    // Wait for either success or error message to appear after redirect
    await this.page.waitForSelector('.alert', { timeout: 10000 });
    
    // Check for error message specifically
    const errorMessage = await this.page.locator('.alert.alert-danger');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    const message = await errorMessage.textContent();
    console.log('⚠️  Error message verified:', message.trim());
  }

  /**
   * Check if navigation is present and functional
   */
  async verifyNavigation() {
    console.log('🧭 Verifying navigation...');
    const isVisible = await this.isVisible(this.selectors.navigation);
    expect(isVisible).toBeTruthy();
    console.log('✅ Navigation verification completed');
  }
}