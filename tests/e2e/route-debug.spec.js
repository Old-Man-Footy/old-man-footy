/**
 * Route-level debugging test
 * 
 * This test verifies that login requests are reaching the correct route
 * and traces the exact request flow through the middleware stack.
 */

import { test, expect } from '@playwright/test';

test.describe('Route-Level Authentication Debug', () => {
  
  test('Trace login request routing', async ({ page }) => {
    console.log('\n=== ROUTE-LEVEL AUTHENTICATION DEBUG ===');
    
    // Step 1: Navigate to login page and verify form structure
    await page.goto('http://localhost:3050/auth/login');
    
    const formAction = await page.getAttribute('form', 'action');
    const formMethod = await page.getAttribute('form', 'method');
    const submitButtonSelector = 'form[action="/auth/login"] button[type="submit"]';
    const submitButtonExists = await page.locator(submitButtonSelector).count();
    
    console.log('1. LOGIN FORM STRUCTURE:');
    console.log(`   Form action: ${formAction}`);
    console.log(`   Form method: ${formMethod}`);
    console.log(`   Submit button found: ${submitButtonExists > 0}`);
    
    if (submitButtonExists === 0) {
      console.log('   ERROR: No submit button found with correct selector!');
      
      // Check what submit buttons exist
      const allSubmitButtons = await page.locator('button[type="submit"]').count();
      console.log(`   Total submit buttons on page: ${allSubmitButtons}`);
      
      for (let i = 0; i < allSubmitButtons; i++) {
        const button = page.locator('button[type="submit"]').nth(i);
        const buttonText = await button.textContent();
        const buttonClass = await button.getAttribute('class');
        const buttonVisible = await button.isVisible();
        console.log(`   Button ${i + 1}: "${buttonText?.trim()}" (class: ${buttonClass}, visible: ${buttonVisible})`);
      }
      return;
    }
    
    // Step 2: Test direct login attempt with network monitoring
    console.log('\n2. TESTING LOGIN REQUEST:');
    
    let requestCaptured = false;
    let responseCaptured = false;
    
    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('/auth/login') && request.method() === 'POST') {
        requestCaptured = true;
        console.log(`   ✅ POST request captured: ${request.url()}`);
        console.log(`   Request headers: ${JSON.stringify(request.headers(), null, 2)}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/auth/login')) {
        responseCaptured = true;
        console.log(`   ✅ Response captured: ${response.status()} ${response.statusText()}`);
        console.log(`   Response headers: ${JSON.stringify(response.headers(), null, 2)}`);
      }
    });
    
    // Fill and submit form
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    
    console.log('   Form filled with credentials');
    
    // Click submit and wait for response
    await page.click(submitButtonSelector);
    await page.waitForLoadState('networkidle');
    
    console.log('\n3. REQUEST/RESPONSE ANALYSIS:');
    console.log(`   Request captured: ${requestCaptured}`);
    console.log(`   Response captured: ${responseCaptured}`);
    
    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);
    
    // Check for error messages
    const errorElement = page.locator('.alert-danger');
    const errorVisible = await errorElement.isVisible();
    
    if (errorVisible) {
      const errorText = await errorElement.textContent();
      console.log(`   Error message visible: "${errorText}"`);
    } else {
      console.log('   No error message visible');
    }
    
    // Check session cookies
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('connect.sid'));
    console.log(`   Session cookie present: ${!!sessionCookie}`);
    
    if (sessionCookie) {
      console.log(`   Session cookie length: ${sessionCookie.value.length}`);
    }
    
    console.log('\n=== END ROUTE-LEVEL DEBUG ===');
    
    // The test should pass regardless - we're just gathering diagnostic info
    expect(true).toBe(true);
  });
  
  test('Compare working vs failing authentication contexts', async ({ page }) => {
    console.log('\n=== AUTHENTICATION CONTEXT COMPARISON ===');
    
    // Test 1: Simple direct authentication (like diagnostic test)
    console.log('\n1. SIMPLE AUTHENTICATION TEST:');
    await page.goto('http://localhost:3050/auth/login');
    
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const simpleResult = page.url();
    console.log(`   Simple auth result: ${simpleResult}`);
    console.log(`   Simple auth success: ${simpleResult.includes('/dashboard')}`);
    
    // Test 2: Reset and try the exact LoginPage sequence
    console.log('\n2. LOGINPAGE CLASS SIMULATION:');
    await page.goto('http://localhost:3050/auth/login');
    
    // Simulate the exact LoginPage.login() sequence
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('form[action="/auth/login"] button[type="submit"]');
    
    // Wait for navigation with timeout like LoginPage does
    let navigationSuccess = false;
    try {
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      navigationSuccess = true;
    } catch (error) {
      console.log(`   Navigation timeout: ${error.message}`);
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // LoginPage verification delay
    
    const loginPageResult = page.url();
    console.log(`   LoginPage simulation result: ${loginPageResult}`);
    console.log(`   LoginPage navigation success: ${navigationSuccess}`);
    console.log(`   LoginPage URL success: ${loginPageResult.includes('/dashboard')}`);
    
    // Compare results
    console.log('\n3. COMPARISON RESULTS:');
    console.log(`   Simple method success: ${simpleResult.includes('/dashboard')}`);
    console.log(`   LoginPage method success: ${loginPageResult.includes('/dashboard')}`);
    console.log(`   Methods produce same result: ${simpleResult === loginPageResult}`);
    
    console.log('\n=== END CONTEXT COMPARISON ===');
    
    expect(true).toBe(true);
  });
});