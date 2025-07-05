/**
 * Newsletter Subscription E2E Test
 * 
 * Focused test for newsletter subscription functionality with proper state selection.
 * Following TDD principles and project security guidelines.
 */

import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { TestUtils } from './utils/TestUtils.js';

test.describe('Newsletter Subscription Tests', () => {
  let homePage;

  test.beforeEach(async ({ page }) => {
    // Set longer timeout for form interactions
    test.setTimeout(120000);
    homePage = new HomePage(page);
  });

  test('should subscribe to newsletter with valid email and state selection', async () => {
    // Visit homepage first
    await homePage.visit();
    
    const testEmail = TestUtils.generateTestEmail();
    console.log(`📧 Testing subscription with email: ${testEmail}`);
    
    // Subscribe with explicit state selection
    await homePage.subscribeToNewsletter(testEmail, ['NSW', 'QLD']);
    
    // Verify success
    await homePage.verifySubscriptionSuccess();
    console.log('✅ Newsletter subscription test completed successfully');
  });

  test('should show error for invalid email format', async () => {
    // Visit homepage first
    await homePage.visit();
    
    console.log('🔍 Testing invalid email format');
    
    // Try to subscribe with invalid email but still select states
    await homePage.subscribeToNewsletter('invalid-email-format', ['NSW']);
    
    // Verify error is shown
    await homePage.verifySubscriptionError();
    console.log('✅ Invalid email error test completed successfully');
  });

  test('should require state selection for subscription', async () => {
    // Visit homepage first  
    await homePage.visit();
    
    const testEmail = TestUtils.generateTestEmail();
    console.log(`📧 Testing subscription without state selection for: ${testEmail}`);
    
    // Try to subscribe without selecting any states
    await homePage.subscribeToNewsletter(testEmail, []);
    
    // Should show error about missing state selection
    await homePage.verifySubscriptionError();
    console.log('✅ Required state selection test completed successfully');
  });
});