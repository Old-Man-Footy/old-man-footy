/**
 * Authentication Diagnostic Test
 * 
 * Comprehensive diagnostic to identify the exact root cause of authentication failures.
 * This test systematically examines every layer of the authentication system.
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Diagnostic Tests', () => {
  
  test('Comprehensive authentication diagnostic', async ({ page }) => {
    console.log('\n=== COMPREHENSIVE AUTHENTICATION DIAGNOSTIC ===');
    
    // Step 1: Check if test users exist in database
    console.log('\n1. DATABASE USER VERIFICATION:');
    
    await page.goto('http://localhost:3050/auth/login');
    
    // Step 2: Examine the login form
    console.log('\n2. LOGIN FORM ANALYSIS:');
    const formAction = await page.getAttribute('form', 'action');
    const formMethod = await page.getAttribute('form', 'method');
    console.log(`   Form action: ${formAction}`);
    console.log(`   Form method: ${formMethod}`);
    
    // Step 3: Fill form and capture network requests
    console.log('\n3. NETWORK REQUEST ANALYSIS:');
    
    // Listen to all network requests
    const requests = [];
    const responses = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      });
    });
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers()
      });
    });
    
    // Fill login form
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    
    console.log('   Form filled with admin credentials');
    
    // Submit and wait for response
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Step 4: Analyze the requests and responses
    console.log('\n4. REQUEST/RESPONSE ANALYSIS:');
    
    const loginRequest = requests.find(req => 
      req.url.includes('/auth/login') && req.method === 'POST'
    );
    
    if (loginRequest) {
      console.log('   Login POST request found:');
      console.log(`     URL: ${loginRequest.url}`);
      console.log(`     Method: ${loginRequest.method}`);
      console.log(`     Content-Type: ${loginRequest.headers['content-type']}`);
      
      if (loginRequest.postData) {
        console.log(`     Post Data: ${loginRequest.postData}`);
      }
    } else {
      console.log('   ERROR: No login POST request found!');
    }
    
    const loginResponse = responses.find(resp => 
      resp.url.includes('/auth/login') && resp.status !== 200
    );
    
    if (loginResponse) {
      console.log('   Login response:');
      console.log(`     Status: ${loginResponse.status}`);
      console.log(`     Location: ${loginResponse.headers.location || 'Not set'}`);
    }
    
    // Step 5: Check current page state
    console.log('\n5. POST-LOGIN PAGE STATE:');
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Check for error messages
    const errorElement = page.locator('.alert-danger');
    const hasError = await errorElement.isVisible();
    
    if (hasError) {
      const errorText = await errorElement.textContent();
      console.log(`   Error message: "${errorText}"`);
    } else {
      console.log('   No error message visible');
    }
    
    // Check for success indicators
    const successElement = page.locator('.alert-success');
    const hasSuccess = await successElement.isVisible();
    
    if (hasSuccess) {
      const successText = await successElement.textContent();
      console.log(`   Success message: "${successText}"`);
    }
    
    // Step 6: Check cookies and session
    console.log('\n6. SESSION STATE ANALYSIS:');
    const cookies = await page.context().cookies();
    
    console.log(`   Total cookies: ${cookies.length}`);
    cookies.forEach(cookie => {
      console.log(`     ${cookie.name}: ${cookie.value.substring(0, 20)}... (${cookie.value.length} chars)`);
    });
    
    // Step 7: Try to access a protected route
    console.log('\n7. PROTECTED ROUTE TEST:');
    await page.goto('http://localhost:3050/dashboard');
    await page.waitForLoadState('networkidle');
    
    const dashboardUrl = page.url();
    console.log(`   Dashboard URL result: ${dashboardUrl}`);
    
    if (dashboardUrl.includes('/dashboard')) {
      console.log('   ✅ Successfully accessed dashboard - authentication working!');
    } else if (dashboardUrl.includes('/auth/login')) {
      console.log('   ❌ Redirected to login - authentication failed');
    } else {
      console.log(`   ⚠️  Unexpected redirect to: ${dashboardUrl}`);
    }
    
    console.log('\n=== END COMPREHENSIVE DIAGNOSTIC ===');
  });
  
  test('Direct database user verification', async ({ page }) => {
    console.log('\n=== DIRECT DATABASE VERIFICATION ===');
    
    // Use page.evaluate to run code in the browser context that can access our backend
    const userVerification = await page.evaluate(async () => {
      try {
        // Make API calls to check user data
        const adminResponse = await fetch('/api/debug/user/admin@test.com');
        const delegateResponse = await fetch('/api/debug/user/delegate@test.com');
        
        return {
          adminExists: adminResponse.ok,
          adminStatus: adminResponse.status,
          delegateExists: delegateResponse.ok,
          delegateStatus: delegateResponse.status
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    });
    
    console.log('Database verification result:', userVerification);
    console.log('\n=== END DATABASE VERIFICATION ===');
  });
  
  test('Manual password verification test', async ({ page }) => {
    console.log('\n=== MANUAL PASSWORD VERIFICATION ===');
    
    // Create a temporary debug endpoint test
    await page.goto('http://localhost:3050/auth/login');
    
    // Try to execute some diagnostic JavaScript in the browser
    const diagnosticResult = await page.evaluate(() => {
      // Try to access any global debugging info if available
      return {
        formExists: !!document.querySelector('form'),
        emailInputExists: !!document.querySelector('input[name="email"]'),
        passwordInputExists: !!document.querySelector('input[name="password"]'),
        submitButtonExists: !!document.querySelector('button[type="submit"]'),
        currentUrl: window.location.href
      };
    });
    
    console.log('Form diagnostic:', diagnosticResult);
    console.log('\n=== END MANUAL VERIFICATION ===');
  });
});