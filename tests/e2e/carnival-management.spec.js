/**
 * Carnival Management E2E Tests
 * 
 * Tests for carnival CRUD operations, form validation,
 * and administrative functions.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage.js';
import { TestUtils } from './utils/TestUtils.js';

test.describe('Carnival Management Tests', () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    // Login as admin for carnival management tests
    await loginPage.visit();
    await loginPage.loginAsAdmin();
    await loginPage.verifyLoginSuccess();
  });

  test('should display carnivals list page', async ({ page }) => {
    await page.goto('/carnivals');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h1')).toContainText('Carnivals');
    await expect(page.locator('.carnival-card, .carnival-item')).toBeVisible();
  });

  test('should create a new carnival successfully', async ({ page }) => {
    await page.goto('/carnivals/new');
    await page.waitForLoadState('networkidle');
    
    const carnivalData = {
      'input[name="title"]': `E2E Test Carnival ${Date.now()}`,
      'input[name="date"]': '2025-09-15',
      'select[name="state"]': 'NSW',
      'textarea[name="locationAddress"]': 'Test Stadium, Sydney NSW',
      'input[name="organiserContactName"]': 'Test Organiser',
      'input[name="organiserContactEmail"]': TestUtils.generateTestEmail(),
      'input[name="organiserContactPhone"]': '0400123456',
      'input[name="registrationLink"]': 'https://test.com/register',
      'textarea[name="feesDescription"]': 'Test fees: $150 per team'
    };
    
    await TestUtils.fillForm(page, carnivalData);
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to carnivals list or show success message
    const url = page.url();
    expect(url).toMatch(/\/carnivals/);
    
    // Verify success message or carnival appears in list
    const successIndicator = await TestUtils.elementExists(page, '.alert-success') ||
                            await TestUtils.elementExists(page, '.carnival-card');
    expect(successIndicator).toBeTruthy();
  });

  test('should validate required fields when creating carnival', async ({ page }) => {
    await page.goto('/carnivals/new');
    await page.waitForLoadState('networkidle');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Should show validation errors
    const errorExists = await TestUtils.elementExists(page, '.alert-danger') ||
                       await TestUtils.elementExists(page, '.error-message') ||
                       await TestUtils.elementExists(page, '.is-invalid');
    expect(errorExists).toBeTruthy();
  });

  test('should edit existing carnival', async ({ page }) => {
    // Navigate to carnivals list
    await page.goto('/carnivals');
    await page.waitForLoadState('networkidle');
    
    // Find and click edit button for test carnival
    const editButton = page.locator('a[href*="/edit"], button:has-text("Edit")').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForLoadState('networkidle');
      
      // Update carnival title
      const newTitle = `Updated Carnival ${Date.now()}`;
      await page.fill('input[name="title"]', newTitle);
      
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      
      // Verify update was successful
      const url = page.url();
      expect(url).toMatch(/\/carnivals/);
    }
  });

  test('should delete carnival with confirmation', async ({ page }) => {
    await page.goto('/carnivals');
    await page.waitForLoadState('networkidle');
    
    // Set up dialog handler for confirmation
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    
    const deleteButton = page.locator('button:has-text("Delete"), a:has-text("Delete")').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.waitForLoadState('networkidle');
      
      // Verify deletion was successful (success message or carnival removed)
      const successIndicator = await TestUtils.elementExists(page, '.alert-success');
      expect(successIndicator).toBeTruthy();
    }
  });

  test('should filter carnivals by state', async ({ page }) => {
    await page.goto('/carnivals');
    await page.waitForLoadState('networkidle');
    
    // Check if state filter exists
    const stateFilter = page.locator('select[name="state"], #state-filter');
    
    if (await stateFilter.isVisible()) {
      await stateFilter.selectOption('NSW');
      await page.waitForLoadState('networkidle');
      
      // Verify filtered results
      const carnivalCards = page.locator('.carnival-card, .carnival-item');
      const count = await carnivalCards.count();
      
      if (count > 0) {
        // Check that visible carnivals are from NSW
        const firstCarnival = carnivalCards.first();
        const text = await firstCarnival.textContent();
        expect(text).toContain('NSW');
      }
    }
  });

  test('should search carnivals by title', async ({ page }) => {
    await page.goto('/carnivals');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[name="search"], #search-input, .search-input');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test');
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');
      
      // Verify search results
      const carnivalCards = page.locator('.carnival-card, .carnival-item');
      const count = await carnivalCards.count();
      
      if (count > 0) {
        const firstCarnival = carnivalCards.first();
        const text = await firstCarnival.textContent();
        expect(text.toLowerCase()).toContain('test');
      }
    }
  });

  test('should display carnival details page', async ({ page }) => {
    await page.goto('/carnivals');
    await page.waitForLoadState('networkidle');
    
    // Click on first carnival to view details
    const carnivalLink = page.locator('a[href*="/carnivals/"], .carnival-title a').first();
    
    if (await carnivalLink.isVisible()) {
      await carnivalLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify we're on carnival details page
      const url = page.url();
      expect(url).toMatch(/\/carnivals\/\d+/);
      
      // Verify carnival details are displayed
      const titleExists = await TestUtils.elementExists(page, 'h1, .carnival-title');
      const detailsExist = await TestUtils.elementExists(page, '.carnival-details, .carnival-info');
      
      expect(titleExists || detailsExist).toBeTruthy();
    }
  });
});