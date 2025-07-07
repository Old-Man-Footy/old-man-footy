/**
 * Simple Homepage E2E Test
 * 
 * Basic test to verify homepage loads correctly with proper timing.
 * Following TDD principles and project security guidelines.
 */

import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';

test.describe('Homepage Basic Tests', () => {
  let homePage;

  test.beforeEach(async ({ page }) => {
    // Set longer timeout for slow loading
    test.setTimeout(60000);
    homePage = new HomePage(page);
  });

  test('should load homepage successfully and display main elements', async () => {
    console.log('🔄 Starting homepage load test...');
    
    // Visit homepage with extended waits
    await homePage.visit();
    console.log('✅ Homepage visited successfully');
    
    // Verify basic navigation is present
    await homePage.verifyNavigation();
    console.log('✅ Navigation verified');
    
    console.log('🎯 Homepage load test completed successfully');
  });
});