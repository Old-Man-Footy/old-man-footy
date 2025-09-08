#!/usr/bin/env node
/**
 * Simple E2E Database Reset
 * 
 * This script provides a lightweight alternative to full database recreation.
 * It clears all data while keeping the schema intact.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Reset E2E database by clearing all data
 */
async function resetE2EDatabase() {
  try {
    console.log('🧹 Resetting E2E database...');
    
    // Set environment for E2E testing
    process.env.NODE_ENV = 'e2e';
    
    // Import after setting NODE_ENV
    const { sequelize } = await import('../config/database.mjs');
    const { User, Club, Sponsor, Carnival, CarnivalClub, ClubPlayer, CarnivalSponsor } = await import('../models/index.mjs');
    
    await sequelize.authenticate();
    console.log('✅ Connected to E2E database');
    
    // Clear all data from tables (order matters due to foreign keys)
    await CarnivalClub.destroy({ where: {}, truncate: true });
    await ClubPlayer.destroy({ where: {}, truncate: true });
    await CarnivalSponsor.destroy({ where: {}, truncate: true });
    await Carnival.destroy({ where: {}, truncate: true });
    await Club.destroy({ where: {}, truncate: true });
    await Sponsor.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
    
    // Clear sessions table if it exists
    try {
      await sequelize.query('DELETE FROM Sessions;');
    } catch (error) {
      // Sessions table might not exist yet, that's OK
    }
    
    console.log('🗑️ All data cleared from E2E database');
    console.log('✅ E2E database reset complete - ready for fresh test run');
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ E2E database reset failed:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] === __filename) {
  resetE2EDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { resetE2EDatabase };
