/**
 * Session and Login Flow Diagnostic Test
 * 
 * Tests the complete login flow including session management
 */

import { test, expect } from '@playwright/test';

test.describe('Session Diagnostic Tests', () => {
  
  test('Direct login flow diagnostic', async ({ page }) => {
    console.log('=== LOGIN FLOW DIAGNOSTIC ===');
    
    // Navigate to login page
    await page.goto('http://localhost:3050/auth/login');
    console.log('1. Navigated to login page');
    
    // Fill login form
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    console.log('2. Filled login form with admin credentials');
    
    // Submit form and wait for response
    await page.click('button[type="submit"]');
    console.log('3. Submitted login form');
    
    // Wait for navigation or error
    await page.waitForLoadState('networkidle');
    
    // Check current URL
    const currentUrl = page.url();
    console.log('4. Current URL after login:', currentUrl);
    
    // Check for error messages
    const errorElement = page.locator('.alert-danger');
    const errorVisible = await errorElement.isVisible().catch(() => false);
    if (errorVisible) {
      const errorText = await errorElement.textContent();
      console.log('5. Error message found:', errorText);
    } else {
      console.log('5. No error message visible');
    }
    
    // Check for success indicators
    const dashboardTitle = page.locator('h1, h2, .page-title');
    const titleVisible = await dashboardTitle.isVisible().catch(() => false);
    if (titleVisible) {
      const titleText = await dashboardTitle.textContent();
      console.log('6. Page title/heading:', titleText);
    }
    
    // Check for authentication indicators
    const logoutLink = page.locator('a[href="/auth/logout"], a:has-text("Logout"), a:has-text("Log out")');
    const logoutVisible = await logoutLink.isVisible().catch(() => false);
    console.log('7. Logout link visible:', logoutVisible);
    
    // Check cookies
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('connect'));
    console.log('8. Session cookie found:', !!sessionCookie);
    if (sessionCookie) {
      console.log('   Cookie name:', sessionCookie.name);
      console.log('   Cookie value length:', sessionCookie.value.length);
    }
    
    console.log('=== END LOGIN FLOW DIAGNOSTIC ===');
  });
  
  test('Registration then immediate login test', async ({ page }) => {
    console.log('\n=== REGISTRATION + LOGIN TEST ===');
    
    const testEmail = `fullflow-${Date.now()}@test.com`;
    const testPassword = 'fullflowpass123';
    
    // 1. Register new user
    await page.goto('http://localhost:3050/auth/register');
    await page.fill('input[name="firstName"]', 'Full');
    await page.fill('input[name="lastName"]', 'Flow');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    console.log('1. Registration completed');
    console.log('   Current URL:', page.url());
    
    // 2. Try to login with newly registered user
    if (page.url().includes('/auth/login')) {
      console.log('2. Already on login page, proceeding with login');
    } else {
      await page.goto('http://localhost:3050/auth/login');
      console.log('2. Navigated to login page');
    }
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const loginUrl = page.url();
    console.log('3. Login URL result:', loginUrl);
    
    const loginErrorElement = page.locator('.alert-danger');
    const loginErrorVisible = await loginErrorElement.isVisible().catch(() => false);
    if (loginErrorVisible) {
      const loginErrorText = await loginErrorElement.textContent();
      console.log('4. Login error:', loginErrorText);
    } else {
      console.log('4. No login error - success!');
    }
    
    console.log('=== END REGISTRATION + LOGIN TEST ===');
  });
});