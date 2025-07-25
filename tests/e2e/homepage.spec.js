/**
 * Homepage E2E Tests
 * 
 * Tests for homepage functionality including navigation,
 * newsletter subscription, and basic user interactions.
 */

import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { TestUtils } from './utils/TestUtils.js';

test.describe('Homepage Tests', () => {
  let homePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('should load homepage successfully', async () => {
    await homePage.visit();
    await homePage.verifyNavigation();
  });

  test('should subscribe to newsletter with valid email', async () => {
    await homePage.visit();
    
    const testEmail = TestUtils.generateTestEmail();
    console.log(`Testing newsletter subscription with email: ${testEmail}`);
    
    await homePage.subscribeToNewsletter(testEmail);
    await homePage.verifySubscriptionSuccess();
  });

  test('should show error for invalid email subscription', async () => {
    await homePage.visit();
    
    console.log('Testing newsletter subscription with invalid email');
    await homePage.subscribeToNewsletter('invalid-email');
    await homePage.verifySubscriptionError();
  });
});