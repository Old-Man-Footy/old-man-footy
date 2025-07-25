/**
 * Login Page Object
 * 
 * Page object for the login page with authentication functionality.
 */

import { BasePage } from './BasePage.js';
import { expect } from '@playwright/test';

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Selectors - Fixed to target specific login form elements
    this.selectors = {
      emailInput: 'input[name="email"]',
      passwordInput: 'input[name="password"]',
      loginButton: 'form[action="/auth/login"] button[type="submit"]', // More specific selector
      errorMessage: '.alert-danger',
      successMessage: '.alert-success',
      registerLink: 'a[href="/auth/register"]',
      forgotPasswordLink: 'a[href="/auth/forgot-password"]'
    };
  }

  /**
   * Navigate to login page
   */
  async visit() {
    await this.goto('/auth/login');
    await this.verifyTitle('Login');
  }

  /**
   * Login with credentials
   * @param {string} email - User email
   * @param {string} password - User password
   */
  async login(email, password) {
    await this.fillField(this.selectors.emailInput, email);
    await this.fillField(this.selectors.passwordInput, password);
    await this.clickElement(this.selectors.loginButton);
    
    // Wait for navigation to complete - either success or failure
    try {
      // Wait for successful navigation to dashboard
      await this.page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    } catch (error) {
      // If dashboard navigation fails, check if we're still on login page
      const currentUrl = this.page.url();
      if (currentUrl.includes('/auth/login')) {
        // We're back on login page - check for error message
        await this.page.waitForSelector('.alert-danger', { timeout: 2000 }).catch(() => {
          // No error message found - this is unexpected
        });
      }
      // Let verifyLoginSuccess handle the specific error checking
    }
    
    await this.waitForPageLoad();
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin() {
    await this.login('admin@test.com', 'admin123');
  }

  /**
   * Login as delegate user
   */
  async loginAsDelegate() {
    await this.login('delegate@test.com', 'delegate123');
  }

  /**
   * Verify login success (redirected to dashboard)
   */
  async verifyLoginSuccess() {
    // Give the authentication system time to complete
    await this.page.waitForTimeout(500);
    
    const currentUrl = this.page.url();
    
    // Check if we successfully reached dashboard
    if (currentUrl.includes('/dashboard')) {
      return; // Success!
    }
    
    // If not on dashboard, check if we're back on login with error
    if (currentUrl.includes('/auth/login')) {
      // Login failed - check for error message and throw descriptive error
      const errorElement = this.page.locator(this.selectors.errorMessage);
      const errorVisible = await errorElement.isVisible({ timeout: 2000 });
      if (errorVisible) {
        const errorText = await errorElement.textContent();
        throw new Error(`Login failed with error: ${errorText}`);
      } else {
        throw new Error('Login failed - redirected to login page without error message');
      }
    }
    
    // If we're on some other page, that's unexpected
    throw new Error(`Unexpected page after login: ${currentUrl}`);
  }

  /**
   * Verify login error
   */
  async verifyLoginError() {
    const isVisible = await this.isVisible(this.selectors.errorMessage);
    expect(isVisible).toBeTruthy();
  }

  /**
   * Go to register page
   */
  async goToRegister() {
    await this.clickElement(this.selectors.registerLink);
    await this.verifyURL('/auth/register');
  }
}