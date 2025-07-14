/**
 * Side-by-side authentication comparison test
 * 
 * This test runs the exact same login sequence as both the diagnostic test
 * (which works) and the user-account test (which fails) to identify the difference.
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Comparison Tests', () => {
  
  test('Side-by-side authentication comparison', async ({ page }) => {
    console.log('\n=== SIDE-BY-SIDE AUTHENTICATION COMPARISON ===');
    
    // Test 1: Replicate the WORKING diagnostic test approach
    console.log('\n1. DIAGNOSTIC TEST APPROACH (KNOWN TO WORK):');
    
    await page.goto('http://localhost:3050/auth/login');
    
    // Track network activity
    const requests = [];
    const responses = [];
    
    page.on('request', request => {
      if (request.url().includes('/auth/login')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/auth/login')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      }
    });
    
    // Fill and submit form
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const diagnosticUrl = page.url();
    console.log(`   Result URL: ${diagnosticUrl}`);
    console.log(`   Success: ${diagnosticUrl.includes('/dashboard')}`);
    
    if (requests.length > 0) {
      console.log(`   Request made: ${requests[0].method} ${requests[0].url}`);
      console.log(`   Post data: ${requests[0].postData}`);
    }
    
    if (responses.length > 0) {
      console.log(`   Response status: ${responses[0].status}`);
      console.log(`   Redirect location: ${responses[0].headers.location || 'Not set'}`);
    }
    
    // Test 2: Replicate the FAILING user-account test approach
    console.log('\n2. USER-ACCOUNT TEST APPROACH (FAILING):');
    
    // Reset to login page
    await page.goto('http://localhost:3050/auth/login');
    
    // Clear previous tracking
    requests.length = 0;
    responses.length = 0;
    
    // Use the exact same login sequence as the failing test
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete - either success or failure
    let navigationSuccess = false;
    try {
      // Wait for successful navigation to dashboard
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      navigationSuccess = true;
    } catch (error) {
      // If dashboard navigation fails, check if we're still on login page
      const currentUrl = page.url();
      if (currentUrl.includes('/auth/login')) {
        // We're back on login page - check for error message
        await page.waitForSelector('.alert-danger', { timeout: 2000 }).catch(() => {
          // No error message found - this is unexpected
        });
      }
      // Let verifyLoginSuccess handle the specific error checking
    }
    
    await page.waitForLoadState('networkidle');
    
    // Give the authentication system time to complete
    await page.waitForTimeout(500);
    
    const userAccountUrl = page.url();
    console.log(`   Result URL: ${userAccountUrl}`);
    console.log(`   Navigation success: ${navigationSuccess}`);
    console.log(`   URL success: ${userAccountUrl.includes('/dashboard')}`);
    
    if (requests.length > 0) {
      console.log(`   Request made: ${requests[0].method} ${requests[0].url}`);
      console.log(`   Post data: ${requests[0].postData}`);
    }
    
    if (responses.length > 0) {
      console.log(`   Response status: ${responses[0].status}`);
      console.log(`   Redirect location: ${responses[0].headers.location || 'Not set'}`);
    }
    
    // Check for error messages
    const errorElement = page.locator('.alert-danger');
    const hasError = await errorElement.isVisible();
    
    if (hasError) {
      const errorText = await errorElement.textContent();
      console.log(`   Error message: "${errorText}"`);
    } else {
      console.log('   No error message visible');
    }
    
    // Test 3: Check session state
    console.log('\n3. SESSION STATE COMPARISON:');
    
    const cookies = await page.context().cookies();
    console.log(`   Total cookies: ${cookies.length}`);
    
    const sessionCookie = cookies.find(c => c.name.includes('connect.sid'));
    if (sessionCookie) {
      console.log(`   Session cookie: ${sessionCookie.name} (${sessionCookie.value.length} chars)`);
      console.log(`   Cookie secure: ${sessionCookie.secure}`);
      console.log(`   Cookie httpOnly: ${sessionCookie.httpOnly}`);
      console.log(`   Cookie sameSite: ${sessionCookie.sameSite}`);
    } else {
      console.log('   No session cookie found!');
    }
    
    console.log('\n=== END COMPARISON ===');
  });
  
  test('Test environment state check', async ({ page }) => {
    console.log('\n=== TEST ENVIRONMENT STATE CHECK ===');
    
    // Check if there are differences in test setup that could affect authentication
    await page.goto('http://localhost:3050/auth/login');
    
    // Check if user data exists via our debug API
    try {
      const adminCheck = await page.evaluate(async () => {
        const response = await fetch('/api/debug/user/admin@test.com');
        return await response.json();
      });
      
      console.log('Admin user check:', {
        userFound: adminCheck.userFound,
        isActive: adminCheck.isActive,
        passwordHashLength: adminCheck.passwordHashLength,
        isBcryptHash: adminCheck.isBcryptHash,
        passwordTests: adminCheck.passwordTests
      });
      
    } catch (error) {
      console.log('Debug API check failed:', error.message);
    }
    
    // Check coming soon mode or maintenance mode
    const pageTitle = await page.title();
    const pageContent = await page.textContent('body');
    
    console.log('Page state:', {
      title: pageTitle,
      hasComingSoon: pageContent.includes('coming soon'),
      hasMaintenance: pageContent.includes('maintenance'),
      hasLoginForm: await page.isVisible('input[name="email"]')
    });
    
    console.log('\n=== END ENVIRONMENT CHECK ===');
  });
});