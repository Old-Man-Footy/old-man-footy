/**
 * Dashboard Page Object
 * 
 * Page object for the user dashboard with profile and account management functionality.
 */

import { BasePage } from './BasePage.js';
import { expect } from '@playwright/test';

export class DashboardPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Selectors
    this.selectors = {
      welcomeHeading: 'h1:has-text("Welcome")',
      userBadge: '.badge',
      profileSettingsToggle: '[data-bs-target="#profile-settings"], .btn:has-text("Profile")',
      profileSection: '#profile-settings, .card:has-text("Profile")',
      clubInfo: '.badge:has-text("Delegate"), .badge:has-text("Primary")',
      statCards: '.card:has(.display-4), .dashboard-stat-card',
      logoutLink: 'a[href*="logout"], form[action*="logout"]',
      dashboardLink: 'a[href="/dashboard"]',
      inviteButton: '[data-bs-target="#inviteModal"], a[href*="invite"], button:has-text("invite")',
      clubManageLink: 'a[href="/clubs/manage"]',
      noClubText: 'text=/No club association/, text=/Join.*Create/, text=/club.*manage/',
      quickStartChecklist: '#quickStartChecklist, .card:has-text("Quick Start")',
      carnivalTabs: '[data-bs-toggle="tab"]'
    };
  }

  /**
   * Navigate to dashboard
   */
  async visit() {
    await this.goto('/dashboard');
    await this.verifyTitle('Dashboard');
  }

  /**
   * Verify dashboard loads correctly
   */
  async verifyDashboardLoaded() {
    await this.waitForSelector(this.selectors.welcomeHeading);
    await expect(this.page.locator(this.selectors.welcomeHeading)).toBeVisible();
  }

  /**
   * Verify user has club association
   */
  async verifyUserHasClub() {
    await expect(this.page.locator(this.selectors.clubInfo)).toBeVisible();
  }

  /**
   * Verify user has no club association
   */
  async verifyUserHasNoClub() {
    await expect(this.page.locator(this.selectors.noClubText)).toBeVisible();
  }

  /**
   * Click profile settings toggle
   */
  async openProfileSettings() {
    const toggle = this.page.locator(this.selectors.profileSettingsToggle).first();
    if (await toggle.isVisible({ timeout: 2000 })) {
      await toggle.click();
      await expect(this.page.locator(this.selectors.profileSection)).toBeVisible();
    }
  }

  /**
   * Access invite functionality if available
   */
  async openInviteModal() {
    const inviteButton = this.page.locator(this.selectors.inviteButton).first();
    if (await inviteButton.isVisible({ timeout: 2000 })) {
      await inviteButton.click();
      return true;
    }
    return false;
  }

  /**
   * Send invitation email
   * @param {string} email - Email to send invitation to
   */
  async sendInvitation(email) {
    const opened = await this.openInviteModal();
    if (!opened) return false;

    const emailInput = this.page.locator('input[name="email"], input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 2000 })) {
      await emailInput.fill(email);
      
      const submitButton = this.page.locator('button[type="submit"], .btn-primary').first();
      await submitButton.click();
      await this.waitForPageLoad();
      return true;
    }
    return false;
  }

  /**
   * Navigate to club management
   */
  async goToClubManagement() {
    await this.clickElement(this.selectors.clubManageLink);
    await this.verifyURL('/clubs/manage');
  }

  /**
   * Verify statistics are displayed
   */
  async verifyStatisticsDisplayed() {
    await expect(this.page.locator(this.selectors.statCards).first()).toBeVisible();
  }

  /**
   * Verify proper navigation elements
   */
  async verifyNavigation() {
    await expect(this.page.locator(this.selectors.dashboardLink)).toBeVisible();
    await expect(this.page.locator(this.selectors.logoutLink)).toBeVisible();
  }

  /**
   * Check if quick start checklist is visible (for new users)
   */
  async isQuickStartVisible() {
    return await this.page.locator(this.selectors.quickStartChecklist).isVisible({ timeout: 2000 });
  }

  /**
   * Switch between carnival tabs (hosted/attending)
   * @param {string} tab - Tab to switch to ('hosted' or 'attending')
   */
  async switchCarnivalTab(tab) {
    const tabSelector = `[data-bs-target="#${tab}-carnivals"]`;
    const tabElement = this.page.locator(tabSelector);
    
    if (await tabElement.isVisible({ timeout: 2000 })) {
      await tabElement.click();
      await this.page.waitForTimeout(500); // Wait for tab animation
    }
  }

  /**
   * Verify user badge/role is displayed
   */
  async verifyUserRole() {
    await expect(this.page.locator(this.selectors.userBadge)).toBeVisible();
  }
}