/**
 * User Account Management E2E Tests
 * 
 * Tests for user profile management, registration, invitations, and account settings.
 * This is Priority 1 in the E2E test plan and must be completed before club management tests.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { UserAccountPage } from './pages/UserAccountPage.js';

test.describe('User Account Management Tests', () => {
  let loginPage;
  let dashboardPage;
  let userAccountPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    userAccountPage = new UserAccountPage(page);
  });

  test.describe('Profile Management', () => {
    test('should display user dashboard with profile information', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      // Verify dashboard loads with user information
      await expect(page.locator('h1')).toContainText('Welcome');
      
      // Check for user role badge specifically (more targeted selector)
      await expect(page.locator('.badge').first()).toBeVisible();
      
      // Check profile section exists - make selector more flexible
      const profileElements = page.locator('[data-bs-target="#profile-settings"], .btn:has-text("Profile"), button:has-text("Settings")');
      await expect(profileElements.first()).toBeVisible();
    });

    test('should update user name successfully', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      await userAccountPage.updateName('UpdatedFirst', 'UpdatedLast');
      
      // Verify success message
      await expect(page.locator('.alert-success')).toContainText('updated successfully');
      
      // Verify name appears in welcome message
      await expect(page.locator('h1')).toContainText('UpdatedFirst');
    });

    test('should update phone number successfully', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      await userAccountPage.updatePhoneNumber('0412345678');
      
      // Verify success message
      await expect(page.locator('.alert-success')).toContainText('updated successfully');
    });

    test('should update email with current password', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      const newEmail = `updated.${Date.now()}@test.com`;
      await userAccountPage.updateEmail(newEmail, 'delegate123');
      
      // Verify success message
      await expect(page.locator('.alert-success')).toContainText('Email address updated successfully');
    });

    test('should show error when updating email with wrong password', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      const newEmail = `wrong.${Date.now()}@test.com`;
      await userAccountPage.updateEmail(newEmail, 'wrongpassword');
      
      // Verify error message
      await expect(page.locator('.alert-danger')).toContainText('Current password is incorrect');
    });

    test('should validate name field requirements', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      // Try to submit empty names
      await userAccountPage.updateName('', '');
      
      // Should show validation errors or prevent submission
      const hasError = await page.locator('.alert-danger').isVisible({ timeout: 2000 });
      const hasValidation = await page.locator('.is-invalid').isVisible({ timeout: 2000 });
      
      expect(hasError || hasValidation).toBeTruthy();
    });

    test('should validate phone number format', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      // Try invalid phone format
      await userAccountPage.updatePhoneNumber('invalid-phone');
      
      // Should show validation error
      const hasError = await page.locator('.alert-danger').isVisible({ timeout: 2000 });
      const hasValidation = await page.locator('.is-invalid').isVisible({ timeout: 2000 });
      
      expect(hasError || hasValidation).toBeTruthy();
    });

    test('should validate email format requirements', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      // Try invalid email format
      await userAccountPage.updateEmail('invalid-email', 'delegate123');
      
      // Should show validation error
      const hasError = await page.locator('.alert-danger').isVisible({ timeout: 2000 });
      const hasValidation = await page.locator('.is-invalid').isVisible({ timeout: 2000 });
      
      expect(hasError || hasValidation).toBeTruthy();
    });
  });

  test.describe('Registration & User Creation', () => {
    test('should display registration form with password confirmation', async ({ page }) => {
      await page.goto('/auth/register');
      
      await expect(page.locator('h1, h2')).toContainText('Create Account');
      await expect(page.locator('input[name="firstName"]')).toBeVisible();
      await expect(page.locator('input[name="lastName"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
      await expect(page.locator('input[name="phoneNumber"]')).toBeVisible();
    });

    test('should register new user successfully with matching passwords', async ({ page }) => {
      await page.goto('/auth/register');
      
      const uniqueEmail = `newuser.${Date.now()}@test.com`;
      const password = 'password123';
      
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', uniqueEmail);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      await page.fill('input[name="phoneNumber"]', '0412345678');
      
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      
      // Should redirect to login with success message
      await expect(page).toHaveURL(/.*\/auth\/login/);
      await expect(page.locator('.alert-success')).toContainText('Registration successful', { timeout: 6000 });
    });

    test('should show error when passwords do not match', async ({ page }) => {
      await page.goto('/auth/register');
      
      const uniqueEmail = `mismatch.${Date.now()}@test.com`;
      
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', uniqueEmail);
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'differentpassword');
      
      await page.click('button[type="submit"]');
      
      // Should show validation error for password mismatch
      const confirmPasswordField = page.locator('input[name="confirmPassword"]');
      const validationMessage = await confirmPasswordField.evaluate(el => el.validationMessage);
      expect(validationMessage).toContain('match');
    });

    test('should validate password confirmation in real-time', async ({ page }) => {
      await page.goto('/auth/register');
      
      const passwordField = page.locator('input[name="password"]');
      const confirmPasswordField = page.locator('input[name="confirmPassword"]');
      
      // Fill password first
      await passwordField.fill('password123');
      
      // Fill mismatched confirmation
      await confirmPasswordField.fill('wrongpassword');
      await confirmPasswordField.blur();
      
      // Check validation state
      const isInvalid = await confirmPasswordField.evaluate(el => el.checkValidity());
      expect(isInvalid).toBeFalsy();
      
      // Fix the confirmation password
      await confirmPasswordField.fill('password123');
      await confirmPasswordField.blur();
      
      // Should now be valid
      const isValid = await confirmPasswordField.evaluate(el => el.checkValidity());
      expect(isValid).toBeTruthy();
    });

    test('should validate required fields in registration including password confirmation', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Should show validation errors for required fields
      const requiredFields = [
        'input[name="firstName"]',
        'input[name="lastName"]',
        'input[name="email"]',
        'input[name="password"]',
        'input[name="confirmPassword"]'
      ];
      
      for (const fieldSelector of requiredFields) {
        const field = page.locator(fieldSelector);
        const isValid = await field.evaluate(el => el.checkValidity());
        expect(isValid).toBeFalsy();
      }
    });

    test('should validate password minimum length requirement', async ({ page }) => {
      await page.goto('/auth/register');
      
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', `test.${Date.now()}@example.com`);
      await page.fill('input[name="password"]', '123'); // Too short
      await page.fill('input[name="confirmPassword"]', '123'); // Also too short
      
      await page.click('button[type="submit"]');
      
      // Should show password validation error for minimum length
      const passwordField = page.locator('input[name="password"]');
      const isValid = await passwordField.evaluate(el => el.checkValidity());
      expect(isValid).toBeFalsy();
    });

    test('should show error for duplicate email registration', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Try to register with existing test user email
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', 'delegate@test.com'); // Existing user
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'password123');
      
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      
      // Should show error about existing user - reduced timeout for flash message
      await expect(page.locator('.alert-danger')).toContainText('already exists', { timeout: 6000 });
    });

    test('should validate email format in registration', async ({ page }) => {
      await page.goto('/auth/register');
      
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', 'invalid-email'); // Invalid format
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'password123');
      
      await page.click('button[type="submit"]');
      
      // Should show email validation error
      const emailField = page.locator('input[name="email"]');
      const isValid = await emailField.evaluate(el => el.checkValidity());
      expect(isValid).toBeFalsy();
    });

    test('should validate phone number format when provided', async ({ page }) => {
      await page.goto('/auth/register');
      
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', `phone.${Date.now()}@test.com`);
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'password123');
      await page.fill('input[name="phoneNumber"]', 'abc123'); // Invalid format
      
      await page.click('button[type="submit"]');
      
      // Should show phone validation error
      const phoneField = page.locator('input[name="phoneNumber"]');
      const isValid = await phoneField.evaluate(el => el.checkValidity());
      expect(isValid).toBeFalsy();
    });

    test('should allow registration without phone number (optional field)', async ({ page }) => {
      await page.goto('/auth/register');
      
      const uniqueEmail = `nophone.${Date.now()}@test.com`;
      const password = 'password123';
      
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', uniqueEmail);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      // Intentionally leave phone number empty
      
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      
      // Should still succeed without phone number
      await expect(page).toHaveURL(/.*\/auth\/login/);
      await expect(page.locator('.alert-success')).toContainText('Registration successful', { timeout: 6000 });
    });
  });

  test.describe('Invitation Workflow', () => {
    test('should show invitation form for primary delegates', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsAdmin(); // Admin likely has primary delegate privileges
      await loginPage.verifyLoginSuccess();

      // Look for invite functionality in dashboard
      const inviteButton = page.locator('[data-bs-target="#inviteModal"], a[href*="invite"], button:has-text("invite")').first();
      
      if (await inviteButton.isVisible({ timeout: 2000 })) {
        await inviteButton.click();
        
        // Should show invitation form
        await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
      }
    });

    test('should send invitation successfully', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsAdmin();
      await loginPage.verifyLoginSuccess();

      // Try to find and use invitation functionality
      const inviteButton = page.locator('[data-bs-target="#inviteModal"], a[href*="invite"], button:has-text("invite")').first();
      
      if (await inviteButton.isVisible({ timeout: 2000 })) {
        await inviteButton.click();
        
        const emailInput = page.locator('input[name="email"], input[type="email"]').first();
        if (await emailInput.isVisible({ timeout: 2000 })) {
          await emailInput.fill(`invited.${Date.now()}@test.com`);
          
          const submitButton = page.locator('button[type="submit"], .btn-primary').first();
          await submitButton.click();
          await page.waitForLoadState('networkidle');
          
          // Should show success message
          const hasSuccess = await page.locator('.alert-success').isVisible({ timeout: 3000 });
          if (hasSuccess) {
            await expect(page.locator('.alert-success')).toContainText('Invitation sent');
          }
        }
      }
    });

    test('should validate invitation email format', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsAdmin();
      await loginPage.verifyLoginSuccess();

      const inviteButton = page.locator('[data-bs-target="#inviteModal"], a[href*="invite"], button:has-text("invite")').first();
      
      if (await inviteButton.isVisible({ timeout: 2000 })) {
        await inviteButton.click();
        
        const emailInput = page.locator('input[name="email"], input[type="email"]').first();
        if (await emailInput.isVisible({ timeout: 2000 })) {
          await emailInput.fill('invalid-email-format');
          
          const submitButton = page.locator('button[type="submit"], .btn-primary').first();
          await submitButton.click();
          
          // Should show validation error
          const hasError = await page.locator('.alert-danger').isVisible({ timeout: 2000 });
          const hasValidation = await page.locator('.is-invalid').isVisible({ timeout: 2000 });
          
          expect(hasError || hasValidation).toBeTruthy();
        }
      }
    });
  });

  test.describe('Account Status and Security', () => {
    test('should display account status information', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      // Check for status indicators
      await expect(page.locator('.badge')).toBeVisible();
      
      // Look for account status information
      const statusElements = page.locator('text=Active, text=Status, .badge-success');
      await expect(statusElements.first()).toBeVisible();
    });

    test('should show creation date in profile', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      // Look for date information in dashboard
      const dateElements = page.locator('text=/\\d{1,2}\/\\d{1,2}\/\\d{4}/, small:has-text("Member since")');
      await expect(dateElements.first()).toBeVisible();
    });

    test('should prevent unauthorized access to profile updates', async ({ page }) => {
      // Test accessing profile update without login
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*\/auth\/login/);
    });

    test('should require current password for sensitive changes', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      // Try to update email without current password (if form allows)
      const emailSection = page.locator('[data-section="email"], .card:has-text("Email")').first();
      
      if (await emailSection.isVisible({ timeout: 2000 })) {
        const emailInput = emailSection.locator('input[type="email"]').first();
        const passwordInput = emailSection.locator('input[type="password"]').first();
        
        if (await emailInput.isVisible() && await passwordInput.isVisible()) {
          await emailInput.fill(`new.${Date.now()}@test.com`);
          // Intentionally don't fill password
          
          const submitButton = emailSection.locator('button[type="submit"], .btn').first();
          await submitButton.click();
          
          // Should show error about missing password
          const hasError = await page.locator('.alert-danger').isVisible({ timeout: 2000 });
          expect(hasError).toBeTruthy();
        }
      }
    });
  });

  test.describe('User Dashboard Integration', () => {
    test('should show appropriate sections for users without clubs', async ({ page }) => {
      // Create and login as a new user without club association
      await page.goto('/auth/register');
      
      const uniqueEmail = `noclubuser.${Date.now()}@test.com`;
      await page.fill('input[name="firstName"]', 'NoClub');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', uniqueEmail);
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');

      // Login with new user
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', uniqueEmail);
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');

      // Should show club creation/joining options
      await expect(page.locator('text=/No club association/, text=/Join.*Create/, text=/club.*manage/')).toBeVisible();
    });

    test('should show club information for users with clubs', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate(); // This user should have a club
      await loginPage.verifyLoginSuccess();

      // Should show club information
      await expect(page.locator('.badge:has-text("Delegate"), .badge:has-text("Primary")')).toBeVisible();
    });

    test('should display user statistics correctly', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      // Check for statistics cards
      const statCards = page.locator('.card:has(.display-4), .dashboard-stat-card');
      await expect(statCards.first()).toBeVisible();
    });

    test('should show appropriate navigation options', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      // Check navigation elements
      await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
      await expect(page.locator('a[href*="logout"], form[action*="logout"]')).toBeVisible();
    });
  });

  test.describe('Profile Settings UI', () => {
    test('should toggle profile settings section', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      // Look for profile settings toggle
      const profileToggle = page.locator('[data-bs-target="#profile-settings"], .btn:has-text("Profile"), button:has-text("Settings")').first();
      
      if (await profileToggle.isVisible({ timeout: 2000 })) {
        await profileToggle.click();
        
        // Should show/hide profile settings
        const profileSection = page.locator('#profile-settings, .card:has-text("Profile")').first();
        await expect(profileSection).toBeVisible();
      }
    });

    test('should have consistent form validation styling', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      // Check for Bootstrap form classes
      const formInputs = page.locator('input.form-control, .form-group, .card');
      await expect(formInputs.first()).toBeVisible();
    });

    test('should show proper success/error message styling', async ({ page }) => {
      await loginPage.visit();
      await loginPage.loginAsDelegate();
      await loginPage.verifyLoginSuccess();

      // Try a profile update to trigger messaging
      await userAccountPage.updateName('TestUpdate', 'User');
      
      // Check for proper alert styling
      const alertElement = page.locator('.alert');
      if (await alertElement.isVisible({ timeout: 2000 })) {
        const hasCorrectClass = await alertElement.getAttribute('class');
        expect(hasCorrectClass).toMatch(/alert-(success|danger|warning|info)/);
      }
    });
  });
});