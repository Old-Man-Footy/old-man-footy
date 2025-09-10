import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Sponsor Profile Pages
 * Tests public sponsor detail pages with logo fallback, business info, and external links
 */

test.describe('Sponsor Profile', () => {
  
  test.beforeEach(async () => {
    // Note: Test data is seeded by the global setup
    // The E2E seed script creates sponsors with various data combinations
  });

  test('sponsor profile page loads with basic information', async ({ page }) => {
    // Navigate to sponsors list first
    await page.goto('/sponsors');
    
    // Find and click on the first sponsor to view details
    const firstSponsorCard = page.locator('.sponsor-card').first();
    await expect(firstSponsorCard).toBeVisible();
    
    const viewButton = firstSponsorCard.getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Should navigate to sponsor detail page
    await expect(page).toHaveURL(/\/sponsors\/\d+$/);
    
    // Check basic page structure
    await expect(page.locator('.sponsor-header')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible(); // Sponsor name
  });

  test('displays sponsor logo or fallback icon', async ({ page }) => {
    await page.goto('/sponsors');
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Check for logo image or fallback div with icon
    const logoImage = page.locator('img.sponsor-logo-large');
    const fallbackDiv = page.locator('div.sponsor-logo-large');
    
    // Either a logo image or fallback div should be present
    const hasLogo = await logoImage.isVisible().catch(() => false);
    const hasFallback = await fallbackDiv.isVisible().catch(() => false);
    
    expect(hasLogo || hasFallback).toBe(true);
    
    if (hasLogo) {
      // If logo exists, check it has proper alt text
      await expect(logoImage).toHaveAttribute('alt', /Logo$/);
    } else if (hasFallback) {
      // Check fallback has the building icon
      const buildingIcon = fallbackDiv.locator('i.bi-building');
      await expect(buildingIcon).toBeVisible();
    }
  });

  test('displays business type when present', async ({ page }) => {
    await page.goto('/sponsors');
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Look for business type section
    const businessTypeSection = page.locator('.sponsor-info-item:has(.bi-building)');
    const hasBusinessType = await businessTypeSection.isVisible().catch(() => false);
    
    if (hasBusinessType) {
      // Should have proper heading and content
      await expect(businessTypeSection.getByText('Business Type')).toBeVisible();
      await expect(businessTypeSection.locator('p')).not.toBeEmpty();
    }
  });

  test('displays location information when present', async ({ page }) => {
    await page.goto('/sponsors');
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Look for location section
    const locationSection = page.locator('.sponsor-info-item:has(.bi-geo-alt)');
    const hasLocation = await locationSection.isVisible().catch(() => false);
    
    if (hasLocation) {
      // Should have proper heading and content
      await expect(locationSection.getByText('Location')).toBeVisible();
      await expect(locationSection.locator('p')).not.toBeEmpty();
      
      // Location should include state information from our test data
      const locationText = await locationSection.locator('p').textContent();
      expect(locationText).toMatch(/(NSW|VIC|QLD|WA)/);
    }
  });

  test('displays description when present', async ({ page }) => {
    await page.goto('/sponsors');
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Look for description in the header area
    const description = page.locator('.lead');
    const hasDescription = await description.isVisible().catch(() => false);
    
    if (hasDescription) {
      // Description should not be empty
      await expect(description).not.toBeEmpty();
    }
  });

  test('displays website link when present', async ({ page }) => {
    await page.goto('/sponsors');
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Look for website section
    const websiteSection = page.locator('.sponsor-info-item:has(.bi-globe)');
    const hasWebsite = await websiteSection.isVisible().catch(() => false);
    
    if (hasWebsite) {
      // Should have proper heading and external link
      await expect(websiteSection.getByText('Website')).toBeVisible();
      const websiteLink = websiteSection.locator('a');
      await expect(websiteLink).toHaveAttribute('target', '_blank');
      await expect(websiteLink).toHaveAttribute('rel', 'noopener');
    }
  });

  test('displays contact information when present', async ({ page }) => {
    await page.goto('/sponsors');
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Check for contact person
    const contactPersonSection = page.locator('.sponsor-info-item:has(.bi-person)');
    const hasContactPerson = await contactPersonSection.isVisible().catch(() => false);
    
    if (hasContactPerson) {
      await expect(contactPersonSection.getByText('Contact Person')).toBeVisible();
    }
    
    // Check for contact email
    const contactEmailSection = page.locator('.sponsor-info-item:has(.bi-envelope)');
    const hasContactEmail = await contactEmailSection.isVisible().catch(() => false);
    
    if (hasContactEmail) {
      await expect(contactEmailSection.getByText('Contact Email')).toBeVisible();
      const emailLink = contactEmailSection.locator('a[href^="mailto:"]');
      await expect(emailLink).toBeVisible();
    }
    
    // Check for contact phone
    const contactPhoneSection = page.locator('.sponsor-info-item:has(.bi-telephone)');
    const hasContactPhone = await contactPhoneSection.isVisible().catch(() => false);
    
    if (hasContactPhone) {
      await expect(contactPhoneSection.getByText('Contact Phone')).toBeVisible();
      const phoneLink = contactPhoneSection.locator('a[href^="tel:"]');
      await expect(phoneLink).toBeVisible();
    }
  });

  test('displays member since date correctly', async ({ page }) => {
    await page.goto('/sponsors');
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Member since should always be present
    const memberSinceSection = page.locator('.sponsor-info-item:has(.bi-calendar)');
    await expect(memberSinceSection).toBeVisible();
    await expect(memberSinceSection.getByText('Member Since')).toBeVisible();
    
    // Date should be formatted properly (Australian format)
    const dateText = await memberSinceSection.locator('p').textContent();
    expect(dateText).toMatch(/\d{1,2}\s+\w+\s+\d{4}/); // e.g., "27 August 2025"
  });

  test('displays social media links when present', async ({ page }) => {
    await page.goto('/sponsors');
    
    // Find a sponsor that might have social media links
    // Note: Our test data may not include social links, so this tests the functionality
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Check if social media section exists
    const socialSection = page.locator('.social-links');
    const hasSocialLinks = await socialSection.isVisible().catch(() => false);
    
    if (hasSocialLinks) {
      // Check for different social media platforms
      const facebookLink = socialSection.locator('a.btn-facebook');
      const instagramLink = socialSection.locator('a.btn-instagram');
      const twitterLink = socialSection.locator('a.btn-twitter-x');
      const linkedinLink = socialSection.locator('a.btn-linkedin');
      
      // All social links should open in new tab
      const allSocialLinks = socialSection.locator('a');
      const linkCount = await allSocialLinks.count();
      
      for (let i = 0; i < linkCount; i++) {
        const link = allSocialLinks.nth(i);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener');
      }
    }
  });

  test('shows associated club when present', async ({ page }) => {
    await page.goto('/sponsors');
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Check for associated club section
    const clubSection = page.getByText('Associated Club');
    const hasAssociatedClub = await clubSection.isVisible().catch(() => false);
    
    if (hasAssociatedClub) {
      // Should have club card with link
      const clubCard = page.locator('.sponsor-club-card-hover');
      await expect(clubCard).toBeVisible();
      
      // Club card should be a link
      const clubLink = page.locator('a:has(.sponsor-club-card-hover)');
      await expect(clubLink).toHaveAttribute('href', /\/clubs\/\d+$/);
    }
  });

  test('sponsor details section displays correctly', async ({ page }) => {
    await page.goto('/sponsors');
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Check sponsor details section
    const detailsSection = page.getByText('Sponsor Details');
    await expect(detailsSection).toBeVisible();
    
    // Should show days active calculation
    const daysActive = page.locator('.h3.text-primary');
    await expect(daysActive).toBeVisible();
    
    const daysActiveText = await daysActive.textContent();
    expect(parseInt(daysActiveText)).toBeGreaterThanOrEqual(0);
  });

  test('admin actions are hidden for public users', async ({ page }) => {
    await page.goto('/sponsors');
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Admin action buttons should not be visible for public users
    const editButton = page.getByRole('link', { name: /Edit/i });
    const deleteButton = page.getByRole('button', { name: /Delete/i });
    const toggleButton = page.locator('[data-action="toggle-status-btn"]');
    
    await expect(editButton).not.toBeVisible();
    await expect(deleteButton).not.toBeVisible();
    await expect(toggleButton).not.toBeVisible();
  });

  test('page has proper SEO and accessibility', async ({ page }) => {
    await page.goto('/sponsors');
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Should have proper page title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    
    // Should have main heading
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible();
    
    // Should have proper semantic structure
    const main = page.locator('main, .container');
    await expect(main.first()).toBeVisible();
  });

  test('navigation works correctly', async ({ page }) => {
    await page.goto('/sponsors');
    const viewButton = page.locator('.sponsor-card').first().getByRole('link', { name: /View/i });
    await viewButton.click();
    
    // Should be on sponsor detail page
    await expect(page).toHaveURL(/\/sponsors\/\d+$/);
    
    // Navigation should work (back to sponsors list)
    await page.goBack();
    await expect(page).toHaveURL('/sponsors');
    
    // Should show sponsors list again
    await expect(page.locator('h1', { hasText: 'Sponsors' })).toBeVisible();
  });

});
