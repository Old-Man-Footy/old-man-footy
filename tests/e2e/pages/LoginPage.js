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
    
    // Selectors
    this.selectors = {
      emailInput: 'input[name="email"]',
      passwordInput: 'input[name="password"]',
      loginButton: 'button[type="submit"]',
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
    await this.verifyURL('/dashboard');
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