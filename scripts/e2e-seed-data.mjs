/**
 * E2E Sponsor Seeding Script
 * 
 * Creates minimal sponsor and club data specifically for E2E filter testing.
 * This script respects the NODE_ENV=test environment and uses Sequelize models.
 * 
 * SECURITY: This script can ONLY run in test or e2e environments
 */

import { sequelize, Club, Sponsor, User } from '../models/index.mjs';
import { AUSTRALIAN_STATES, SPONSORSHIP_LEVELS } from '../config/constants.mjs';

/**
 * Validate that we're running in a safe environment
 */
function validateTestEnvironment() {
  const env = process.env.NODE_ENV;
  
  console.log(`🔍 Checking environment: ${env || 'undefined'}`);
  
  if (!env || !['test', 'e2e'].includes(env)) {
    console.error(`❌ E2E seeding can only run in 'test' or 'e2e' environments. Current: ${env || 'undefined'}`);
    process.exit(1);
  }
  
  console.log(`✅ Environment validated: ${env}`);
}

/**
 * Minimal test data for sponsors
 * Covers different states and sponsorship levels for filter testing
 */
const TEST_SPONSORS = [
  {
    sponsorName: 'Test Gold Sponsor NSW',
    businessType: 'Test Business',
    location: 'Sydney',
    state: 'NSW',
    description: 'A test gold sponsor in NSW for filter testing',
    contactPerson: 'Test Person',
    contactEmail: 'test@goldnsw.com',
    contactPhone: '02 9999 0001',
    website: 'https://www.testgoldnsw.com',
    logoUrl: '/icons/seed.svg',
    sponsorshipLevel: SPONSORSHIP_LEVELS.GOLD,
    isActive: true,
    isPubliclyVisible: true
  },
  {
    sponsorName: 'Test Silver Sponsor VIC',
    businessType: 'Test Services',
    location: 'Melbourne',
    state: 'VIC',
    description: 'A test silver sponsor in VIC for filter testing',
    contactPerson: 'Test Manager',
    contactEmail: 'test@silvervic.com',
    contactPhone: '03 9999 0002',
    website: 'https://www.testsilvervic.com',
    facebookUrl: 'https://facebook.com/testsilvervic',
    logoUrl: '/icons/seed.svg',
    sponsorshipLevel: SPONSORSHIP_LEVELS.SILVER,
    isActive: true,
    isPubliclyVisible: true
  },
  {
    sponsorName: 'Test Bronze Sponsor QLD',
    businessType: 'Test Manufacturing',
    location: 'Brisbane',
    state: 'QLD',
    description: 'A test bronze sponsor in QLD for filter testing',
    contactPerson: 'Test Director',
    contactEmail: 'test@bronzeqld.com',
    contactPhone: '07 9999 0003',
    instagramUrl: 'https://instagram.com/testbronzeqld',
    twitterUrl: 'https://twitter.com/testbronzeqld',
    logoUrl: '/icons/seed.svg',
    sponsorshipLevel: SPONSORSHIP_LEVELS.BRONZE,
    isActive: true,
    isPubliclyVisible: true
  },
  {
    sponsorName: 'Test Supporting Sponsor NSW',
    businessType: 'Test Retail',
    location: 'Newcastle',
    state: 'NSW',
    description: 'A test supporting sponsor in NSW for filter testing',
    contactPerson: 'Test Owner',
    contactEmail: 'test@supportingnsw.com',
    contactPhone: '02 4999 0004',
    website: 'https://www.testsupportingnsw.com',
    linkedinUrl: 'https://linkedin.com/company/testsupportingnsw',
    logoUrl: '/icons/seed.svg',
    sponsorshipLevel: SPONSORSHIP_LEVELS.SUPPORTING,
    isActive: true,
    isPubliclyVisible: true
  },
  {
    sponsorName: 'Test Inactive Sponsor WA',
    businessType: 'Test Inactive',
    location: 'Perth',
    state: 'WA',
    description: 'A test inactive sponsor for testing visibility filters',
    contactPerson: 'Test Inactive',
    contactEmail: 'test@inactivewa.com',
    contactPhone: '08 9999 0005',
    logoUrl: '/icons/seed.svg',
    sponsorshipLevel: SPONSORSHIP_LEVELS.BRONZE,
    isActive: false,
    isPubliclyVisible: false
  }
];

/**
 * Minimal test clubs to own the sponsors
 */
const TEST_CLUBS = [
  {
    clubName: 'Test E2E Club NSW',
    state: 'NSW',
    location: 'Sydney',
    contactEmail: 'test@e2eclubnsw.com',
    contactPhone: '02 9999 1001',
    contactPerson: 'Test Delegate NSW',
    description: 'Test club for E2E sponsor testing in NSW',
    isActive: true,
    isPubliclyListed: true
  },
  {
    clubName: 'Test E2E Club VIC',
    state: 'VIC',
    location: 'Melbourne',
    contactEmail: 'test@e2eclubvic.com',
    contactPhone: '03 9999 1002',
    contactPerson: 'Test Delegate VIC',
    description: 'Test club for E2E sponsor testing in VIC',
    isActive: true,
    isPubliclyListed: true
  },
  {
    clubName: 'Test E2E Club QLD',
    state: 'QLD',
    location: 'Brisbane',
    contactEmail: 'test@e2eclubqld.com',
    contactPhone: '07 9999 1003',
    contactPerson: 'Test Delegate QLD',
    description: 'Test club for E2E sponsor testing in QLD',
    isActive: true,
    isPubliclyListed: true
  },
  {
    clubName: 'Test E2E Club WA',
    state: 'WA',
    location: 'Perth',
    contactEmail: 'test@e2eclubwa.com',
    contactPhone: '08 9999 1004',
    contactPerson: 'Test Delegate WA',
    description: 'Test club for E2E sponsor testing in WA',
    isActive: true,
    isPubliclyListed: true
  }
];

/**
 * Minimal test users to be delegates for the clubs
 */
const TEST_USERS = [
  {
    firstName: 'E2E',
    lastName: 'Delegate NSW',
    email: 'e2e.delegate.nsw@test.com',
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewjhlBbRdVVJpBG6', // hashed "TestPass123!"
    isActive: true,
    isPrimaryDelegate: true,
    emailVerified: true
  },
  {
    firstName: 'E2E',
    lastName: 'Delegate VIC',
    email: 'e2e.delegate.vic@test.com',
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewjhlBbRdVVJpBG6', // hashed "TestPass123!"
    isActive: true,
    isPrimaryDelegate: true,
    emailVerified: true
  },
  {
    firstName: 'E2E',
    lastName: 'Delegate QLD',
    email: 'e2e.delegate.qld@test.com',
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewjhlBbRdVVJpBG6', // hashed "TestPass123!"
    isActive: true,
    isPrimaryDelegate: true,
    emailVerified: true
  },
  {
    firstName: 'E2E',
    lastName: 'Delegate WA',
    email: 'e2e.delegate.wa@test.com',
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewjhlBbRdVVJpBG6', // hashed "TestPass123!"
    isActive: true,
    isPrimaryDelegate: true,
    emailVerified: true
  }
];

/**
 * Clean up existing E2E test data
 */
async function cleanupExistingData() {
  console.log('🧹 Cleaning up existing E2E test data...');
  
  // Delete sponsors first (due to foreign key constraints)
  await Sponsor.destroy({
    where: {
      sponsorName: {
        [sequelize.Sequelize.Op.like]: 'Test %'
      }
    },
    force: true
  });
  
  // Delete users before clubs (due to foreign key constraints)
  await User.destroy({
    where: {
      email: {
        [sequelize.Sequelize.Op.like]: '%@test.com'
      }
    },
    force: true
  });
  
  // Delete clubs
  await Club.destroy({
    where: {
      clubName: {
        [sequelize.Sequelize.Op.like]: 'Test E2E %'
      }
    },
    force: true
  });
  
  console.log('✅ Cleanup completed');
}

/**
 * Create test clubs
 */
async function createTestClubs() {
  console.log('🏉 Creating test clubs...');
  
  const clubs = [];
  for (const clubData of TEST_CLUBS) {
    const club = await Club.create(clubData);
    clubs.push(club);
    console.log(`   ✓ Created club: ${club.clubName} (ID: ${club.id})`);
  }
  
  return clubs;
}

/**
 * Create test users and assign them to clubs
 */
async function createTestUsers(clubs) {
  console.log('👥 Creating test users...');
  
  const users = [];
  for (let i = 0; i < TEST_USERS.length; i++) {
    const userData = {
      ...TEST_USERS[i],
      clubId: clubs[i].id
    };
    
    const user = await User.create(userData);
    users.push(user);
    console.log(`   ✓ Created user: ${user.email} for club ${clubs[i].clubName}`);
  }
  
  return users;
}

/**
 * Create test sponsors linked to clubs
 */
async function createTestSponsors(clubs) {
  console.log('💼 Creating test sponsors...');
  
  const sponsors = [];
  for (let i = 0; i < TEST_SPONSORS.length; i++) {
    const sponsorData = {
      ...TEST_SPONSORS[i],
      clubId: clubs[i % clubs.length].id // Distribute sponsors across clubs
    };
    
    const sponsor = await Sponsor.create(sponsorData);
    sponsors.push(sponsor);
    console.log(`   ✓ Created sponsor: ${sponsor.sponsorName} (Level: ${sponsor.sponsorshipLevel}, State: ${sponsor.state})`);
  }
  
  return sponsors;
}

/**
 * Main seeding function
 */
async function seedE2ESponsors() {
  try {
    console.log(`🔍 Current NODE_ENV: ${process.env.NODE_ENV}`);
    console.log('About to validate test environment...');
    validateTestEnvironment();
    console.log('✅ Environment validation passed');
    
    console.log('🌱 Starting E2E sponsor seeding...');
    
    // Ensure database connection
    console.log('⏳ Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection verified');
    
    // Clean up existing test data
    await cleanupExistingData();
    
    // Create test data in the correct order (clubs -> users -> sponsors)
    const clubs = await createTestClubs();
    const users = await createTestUsers(clubs);
    const sponsors = await createTestSponsors(clubs);
    
    console.log('\n📊 E2E Seeding Summary:');
    console.log(`   • ${clubs.length} test clubs created`);
    console.log(`   • ${users.length} test users created`);
    console.log(`   • ${sponsors.length} test sponsors created`);
    console.log('   • Coverage: NSW, VIC, QLD, WA states');
    console.log('   • Levels: Gold, Silver, Bronze, Supporting');
    console.log('   • Includes inactive sponsor for visibility testing');
    
    console.log('\n🎉 E2E sponsor seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ E2E seeding failed:', error);
    throw error;
  }
}

/**
 * Cleanup function for resetting between test runs
 */
async function resetE2ESponsors() {
  try {
    validateTestEnvironment();
    
    console.log('🔄 Resetting E2E sponsor data...');
    
    await sequelize.authenticate();
    await cleanupExistingData();
    
    console.log('✅ E2E sponsor data reset completed');
    
  } catch (error) {
    console.error('❌ E2E reset failed:', error);
    throw error;
  }
}

// Export functions for programmatic use
export { seedE2ESponsors, resetE2ESponsors };

// Command line execution
// Convert Windows path to URL path for comparison
const scriptPath = process.argv[1].replace(/\\/g, '/');
const isDirectExecution = import.meta.url === `file:///${scriptPath}`;

if (isDirectExecution) {
  const command = process.argv[2];
  
  if (command === '--reset') {
    resetE2ESponsors()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    seedE2ESponsors()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}
