/**
 * Authentication E2E Tests
 * 
 * Tests for login, logout, and authentication flows including
 * role-based access control and session management.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage.js';
import { HomePage } from './pages/HomePage.js';

test.describe('Authentication Tests', () => {
  let loginPage;
  let homePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);
  });

  test('should login successfully with valid admin credentials', async () => {
    await loginPage.visit();
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
  });

  test('should login successfully with valid delegate credentials', async () => {
    await loginPage.visit();
    await loginPage.loginAsDelegate();
    await loginPage.verifyLoginSuccess();
  });

  test('should show error for invalid credentials', async () => {
    await loginPage.visit();
    await loginPage.login('invalid@test.com', 'wrongpassword');
    await loginPage.verifyLoginError();
  });

  test('should show error for non-existent user', async () => {
    await loginPage.visit();
    await loginPage.login('nonexistent@test.com', 'password123');
    await loginPage.verifyLoginError();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });

  test('should maintain session after page refresh', async ({ page }) => {
    await loginPage.visit();
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be logged in
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should logout successfully', async ({ page }) => {
    await loginPage.visit();
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
    
    // Click logout button
    await page.click('a[href="/auth/logout"]');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to homepage
    await expect(page).toHaveURL(/.*\//);
  });

  test('should prevent access to admin routes for non-admin users', async ({ page }) => {
    await loginPage.visit();
    await loginPage.loginAsDelegate();
    await loginPage.verifyLoginSuccess();
    
    // Try to access admin route
    await page.goto('/admin');
    
    // Should be redirected or show error
    const url = page.url();
    expect(url).not.toContain('/admin');
  });
});