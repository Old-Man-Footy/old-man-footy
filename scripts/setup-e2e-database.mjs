#!/usr/bin/env node
/**
 * E2E Database Setup Script
 * 
 * Creates a fresh, isolated database for E2E tests with known test data.
 * This ensures all E2E tests start from the same predictable state.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

const E2E_DB_NAME = 'e2e-old-man-footy.db';
const E2E_DB_PATH = join(__dirname, '..', 'data', E2E_DB_NAME);

/**
 * Setup E2E database with fresh state
 */
async function setupE2EDatabase() {
  try {
    console.log('🗄️ Setting up E2E database...');
    
    // Step 1: Remove existing E2E database
    if (fs.existsSync(E2E_DB_PATH)) {
      fs.unlinkSync(E2E_DB_PATH);
      console.log('🗑️ Removed existing E2E database');
    }

    // Step 2: Set environment for E2E
    process.env.NODE_ENV = 'e2e';
    process.env.DATABASE_URL = `sqlite:./data/${E2E_DB_NAME}`;
    
    console.log(`📝 Using database: ${E2E_DB_NAME}`);
    
    // Step 3: Run migrations for E2E database
    console.log('🔄 Running migrations...');
    const { stdout: migrateOutput } = await execAsync('npx sequelize-cli db:migrate --env e2e', {
      cwd: join(__dirname, '..')
    });
    console.log('✅ Migrations completed');
    
    // Step 4: Seed with known test data
    console.log('🌱 Seeding test data...');
    await seedE2ETestData();
    console.log('✅ Test data seeded');
    
    console.log('🎉 E2E database setup complete!');
    console.log(`   Database: ${E2E_DB_PATH}`);
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    
  } catch (error) {
    console.error('❌ E2E database setup failed:', error);
    throw error;
  }
}

/**
 * Seed database with predictable test data
 */
async function seedE2ETestData() {
  // Import models with E2E environment
  const { sequelize } = await import('../config/database.mjs');
  const { User, Club, Sponsor, Carnival } = await import('../models/index.mjs');
  
  try {
    await sequelize.authenticate();
    
    // Create test users
    await User.bulkCreate([
      {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        password: '$2b$04$x8W5L5lYJ8vE8jWbTGOOLOmKNXxLJ4xHx8V.ZQqKz8xYj8vE8jWbTG', // password: TestPassword123!
        isActive: true,
        isAdmin: false
      }
    ]);
    
    // Create test clubs
    await Club.bulkCreate([
      {
        name: 'Test Rugby Club',
        location: 'Test City',
        isActive: true
      },
      {
        name: 'Sample Masters Club',
        location: 'Sample Town',
        isActive: true
      }
    ]);
    
    // Create test sponsors  
    await Sponsor.bulkCreate([
      {
        name: 'Test Sponsor Corp',
        isActive: true,
        isPubliclyVisible: true
      },
      {
        name: 'Sample Business',
        isActive: true,
        isPubliclyVisible: true
      }
    ]);
    
    // Create test carnivals
    const now = new Date();
    const futureDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now
    
    await Carnival.bulkCreate([
      {
        name: 'Test Carnival 2025',
        location: 'Test Grounds',
        date: futureDate,
        isActive: true
      }
    ]);
    
    console.log('📊 Test data seeded:');
    console.log('   - Users: 1');
    console.log('   - Clubs: 2'); 
    console.log('   - Sponsors: 2');
    console.log('   - Carnivals: 1');
    
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (process.argv[1] === __filename) {
  setupE2EDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { setupE2EDatabase };
