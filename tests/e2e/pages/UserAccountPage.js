/**
 * User Account Page Object
 * 
 * Page object for user account management functionality including profile updates,
 * name changes, email updates, and phone number management.
 */

import { BasePage } from './BasePage.js';
import { expect } from '@playwright/test';

export class UserAccountPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Selectors for profile management forms
    this.selectors = {
      // Name update form
      nameSection: '[data-section="name"], .card:has(input[name="firstName"])',
      firstNameInput: 'input[name="firstName"]',
      lastNameInput: 'input[name="lastName"]',
      nameSubmitBtn: 'form:has(input[name="firstName"]) button[type="submit"], .btn:has-text("Update Name")',
      
      // Phone update form
      phoneSection: '[data-section="phone"], .card:has(input[name="phoneNumber"])',
      phoneInput: 'input[name="phoneNumber"]',
      phoneSubmitBtn: 'form:has(input[name="phoneNumber"]) button[type="submit"], .btn:has-text("Update Phone")',
      
      // Email update form
      emailSection: '[data-section="email"], .card:has(input[name="email"])',
      emailInput: 'input[name="email"]:not([name="currentPassword"])',
      currentPasswordInput: 'input[name="currentPassword"], input[type="password"]',
      emailSubmitBtn: 'form:has(input[name="email"]) button[type="submit"], .btn:has-text("Update Email")',
      
      // General form elements
      alertSuccess: '.alert-success',
      alertDanger: '.alert-danger, .alert-error',
      invalidField: '.is-invalid',
      validationError: '.invalid-feedback, .text-danger',
      
      // Profile display elements
      profileCard: '.card:has-text("Profile"), #profile-settings',
      settingsToggle: '[data-bs-toggle="collapse"], .btn:has-text("Settings")',
      userInfoDisplay: '.user-info, .profile-info'
    };
  }

  /**
   * Update user's first and last name
   * @param {string} firstName - New first name
   * @param {string} lastName - New last name
   */
  async updateName(firstName, lastName) {
    // Try to find and expand profile section if collapsed
    await this.expandProfileSection();
    
    // Look for name form in various possible locations
    const nameForm = await this.findNameForm();
    
    if (nameForm) {
      await nameForm.locator(this.selectors.firstNameInput).fill(firstName);
      await nameForm.locator(this.selectors.lastNameInput).fill(lastName);
      
      const submitBtn = nameForm.locator('button[type="submit"]').first();
      await submitBtn.click();
      await this.waitForPageLoad();
    } else {
      // Fallback: try direct form submission via POST
      await this.page.evaluate(({ firstName, lastName }) => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/auth/update-name';
        
        const firstNameField = document.createElement('input');
        firstNameField.name = 'firstName';
        firstNameField.value = firstName;
        form.appendChild(firstNameField);
        
        const lastNameField = document.createElement('input');
        lastNameField.name = 'lastName';
        lastNameField.value = lastName;
        form.appendChild(lastNameField);
        
        document.body.appendChild(form);
        form.submit();
      }, { firstName, lastName });
      
      await this.waitForPageLoad();
    }
  }

  /**
   * Update user's phone number
   * @param {string} phoneNumber - New phone number
   */
  async updatePhoneNumber(phoneNumber) {
    await this.expandProfileSection();
    
    const phoneForm = await this.findPhoneForm();
    
    if (phoneForm) {
      await phoneForm.locator(this.selectors.phoneInput).fill(phoneNumber);
      
      const submitBtn = phoneForm.locator('button[type="submit"]').first();
      await submitBtn.click();
      await this.waitForPageLoad();
    } else {
      // Fallback: direct form submission
      await this.page.evaluate(({ phoneNumber }) => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/auth/update-phone';
        
        const phoneField = document.createElement('input');
        phoneField.name = 'phoneNumber';
        phoneField.value = phoneNumber;
        form.appendChild(phoneField);
        
        document.body.appendChild(form);
        form.submit();
      }, { phoneNumber });
      
      await this.waitForPageLoad();
    }
  }

  /**
   * Update user's email address
   * @param {string} newEmail - New email address
   * @param {string} currentPassword - Current password for verification
   */
  async updateEmail(newEmail, currentPassword) {
    await this.expandProfileSection();
    
    const emailForm = await this.findEmailForm();
    
    if (emailForm) {
      await emailForm.locator(this.selectors.emailInput).fill(newEmail);
      await emailForm.locator(this.selectors.currentPasswordInput).fill(currentPassword);
      
      const submitBtn = emailForm.locator('button[type="submit"]').first();
      await submitBtn.click();
      await this.waitForPageLoad();
    } else {
      // Fallback: direct form submission
      await this.page.evaluate(({ newEmail, currentPassword }) => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/auth/update-email';
        
        const emailField = document.createElement('input');
        emailField.name = 'email';
        emailField.value = newEmail;
        form.appendChild(emailField);
        
        const passwordField = document.createElement('input');
        passwordField.name = 'currentPassword';
        passwordField.value = currentPassword;
        form.appendChild(passwordField);
        
        document.body.appendChild(form);
        form.submit();
      }, { newEmail, currentPassword });
      
      await this.waitForPageLoad();
    }
  }

  /**
   * Find and expand profile settings section if it exists
   */
  async expandProfileSection() {
    // Try to find and click profile settings toggle
    const toggles = [
      '[data-bs-target="#profile-settings"]',
      '.btn:has-text("Profile")',
      '.btn:has-text("Settings")',
      '[data-bs-toggle="collapse"]'
    ];
    
    for (const selector of toggles) {
      const toggle = this.page.locator(selector).first();
      if (await toggle.isVisible({ timeout: 1000 })) {
        await toggle.click();
        await this.page.waitForTimeout(500); // Wait for collapse animation
        break;
      }
    }
  }

  /**
   * Find the name update form
   */
  async findNameForm() {
    const formSelectors = [
      'form:has(input[name="firstName"])',
      '.card:has(input[name="firstName"])',
      '[data-section="name"]'
    ];
    
    for (const selector of formSelectors) {
      const form = this.page.locator(selector).first();
      if (await form.isVisible({ timeout: 1000 })) {
        return form;
      }
    }
    
    return null;
  }

  /**
   * Find the phone update form
   */
  async findPhoneForm() {
    const formSelectors = [
      'form:has(input[name="phoneNumber"])',
      '.card:has(input[name="phoneNumber"])',
      '[data-section="phone"]'
    ];
    
    for (const selector of formSelectors) {
      const form = this.page.locator(selector).first();
      if (await form.isVisible({ timeout: 1000 })) {
        return form;
      }
    }
    
    return null;
  }

  /**
   * Find the email update form
   */
  async findEmailForm() {
    const formSelectors = [
      'form:has(input[name="email"]):has(input[name="currentPassword"])',
      '.card:has(input[name="email"]):has(input[type="password"])',
      '[data-section="email"]'
    ];
    
    for (const selector of formSelectors) {
      const form = this.page.locator(selector).first();
      if (await form.isVisible({ timeout: 1000 })) {
        return form;
      }
    }
    
    return null;
  }

  /**
   * Verify success message is displayed
   * @param {string} expectedText - Expected text in success message
   */
  async verifySuccessMessage(expectedText = 'updated successfully') {
    await expect(this.page.locator(this.selectors.alertSuccess)).toContainText(expectedText);
  }

  /**
   * Verify error message is displayed
   * @param {string} expectedText - Expected text in error message
   */
  async verifyErrorMessage(expectedText = '') {
    const errorLocator = this.page.locator(this.selectors.alertDanger);
    await expect(errorLocator).toBeVisible();
    
    if (expectedText) {
      await expect(errorLocator).toContainText(expectedText);
    }
  }

  /**
   * Check if form validation errors are present
   */
  async hasValidationErrors() {
    const hasAlertError = await this.page.locator(this.selectors.alertDanger).isVisible({ timeout: 2000 });
    const hasInvalidField = await this.page.locator(this.selectors.invalidField).isVisible({ timeout: 2000 });
    
    return hasAlertError || hasInvalidField;
  }

  /**
   * Verify that profile information is displayed
   */
  async verifyProfileDisplayed() {
    const profileElements = [
      'h1:has-text("Welcome")',
      '.badge',
      '.user-info',
      '.profile-info'
    ];
    
    let found = false;
    for (const selector of profileElements) {
      if (await this.page.locator(selector).isVisible({ timeout: 1000 })) {
        found = true;
        break;
      }
    }
    
    expect(found).toBeTruthy();
  }

  /**
   * Wait for form submission and page reload
   */
  async waitForFormSubmission() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000); // Additional wait for flash messages
  }
}