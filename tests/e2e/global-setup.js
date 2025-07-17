/**
 * Global Setup for Playwright E2E Tests
 * 
 * This file runs once before all tests to set up the test environment
 */

import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting Playwright E2E Test Setup...');
  
  try {
    // Import ES modules
    const { sequelize } = await import('../../config/database.mjs');
    const { initializeDatabase } = await import('../../config/database.mjs');
    
    // Initialize test database
    await initializeDatabase();
    
    // Disable foreign key constraints for SQLite during sync
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    
    // Sync database schema with force to ensure clean state
    await sequelize.sync({ force: true });
    
    // Re-enable foreign key constraints
    await sequelize.query('PRAGMA foreign_keys = ON;');
    
    console.log('✅ Test database initialized and schema synced');
    
    // Create test data
    await createTestData();
    console.log('✅ Test data created');
    
    // Verify server is accessible
    await verifyServerAccess();
    console.log('✅ Server accessibility verified');
    
    console.log('🎯 Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Create essential test data
 */
async function createTestData() {
  const { User, Club, Carnival, Sponsor } = await import('../../models/index.mjs');
  
  // Create test admin user
  const adminUser = await User.create({
    email: 'admin@test.com',
    firstName: 'Test',
    lastName: 'Admin',
    passwordHash: 'admin123', // Will be hashed by model hook
    isAdmin: true,
    isActive: true
  });
  
  // Create test club
  const testClub = await Club.create({
    clubName: 'Test Rugby Club',
    state: 'NSW',
    location: 'Sydney',
    contactPerson: 'John Doe',
    contactEmail: 'contact@testclub.com',
    contactPhone: '0400123456',
    description: 'Test club for E2E testing',
    isActive: true,
    isPubliclyListed: true
  });
  
  // Create test delegate user
  const delegateUser = await User.create({
    email: 'delegate@test.com',
    firstName: 'Test',
    lastName: 'Delegate',
    passwordHash: 'delegate123',
    clubId: testClub.id,
    isPrimaryDelegate: true,
    isActive: true
  });
  
  // Create test carnival
  const testCarnival = await Carnival.create({
    title: 'Test Masters Carnival',
    date: new Date('2025-08-15'),
    state: 'NSW',
    locationAddress: 'Test Stadium, Sydney NSW',
    organiserContactName: 'Test Organiser',
    organiserContactEmail: 'organiser@test.com',
    organiserContactPhone: '0400987654',
    registrationLink: 'https://test.com/register',
    feesDescription: 'Test fees: $100 per team',
    isActive: true,
    isManuallyEntered: true,
    createdBy: adminUser.id
  });
  
  // Create test sponsor
  const testSponsor = await Sponsor.create({
    sponsorName: 'Test Sponsor Co',
    businessType: 'Local Business',
    description: 'Test sponsor for E2E testing',
    contactPerson: 'Jane Smith',
    contactEmail: 'sponsor@test.com',
    contactPhone: '0400555666',
    website: 'https://testsponsor.com',
    logoUrl: '/icons/seed.svg',
    isActive: true,
    isPubliclyVisible: true
  });
  
  console.log('Created test data:', {
    adminUser: adminUser.email,
    delegateUser: delegateUser.email,
    testClub: testClub.clubName,
    testCarnival: testCarnival.title,
    testSponsor: testSponsor.sponsorName
  });
}

/**
 * Verify server accessibility
 */
async function verifyServerAccess() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Try to access the homepage
    await page.goto('http://localhost:3050', { timeout: 30000 });
    
    // Check if page loads successfully
    await page.waitForLoadState('networkidle');
    
    // Verify basic page structure
    const title = await page.title();
    console.log(`Server responded with page title: "${title}"`);
    
  } catch (error) {
    console.error('Server verification failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;