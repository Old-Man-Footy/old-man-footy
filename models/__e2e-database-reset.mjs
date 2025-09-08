// Force environment reset for E2E testing
import fs from 'fs';
import path from 'path';

// Force environment to E2E before any model imports
process.env.NODE_ENV = 'e2e';

// Clear all module cache to ensure fresh imports
function clearNodeModuleCache() {
    // Find all cached modules
    const cacheKeys = Object.keys(require.cache);
    
    // Clear all modules related to this app (not node_modules)
    cacheKeys.forEach(key => {
        if (key.includes('old-man-footy') && !key.includes('node_modules')) {
            delete require.cache[key];
        }
    });
}

// Reset Sequelize instance cache
function resetSequelizeCache() {
    // Clear any global Sequelize instances
    if (global.sequelize) {
        delete global.sequelize;
    }
}

/**
 * Complete E2E database reset with module cache clearing
 */
export async function forceE2EDbReset() {
    // Set environment first
    process.env.NODE_ENV = 'e2e';
    
    // Clear caches
    clearNodeModuleCache();
    resetSequelizeCache();
    
    // Delete E2E database file if it exists
    const e2eDbPath = path.resolve('data/e2e-old-man-footy.db');
    if (fs.existsSync(e2eDbPath)) {
        fs.unlinkSync(e2eDbPath);
        console.log('🗑️ Deleted existing E2E database');
    }
    
    return true;
}

// Auto-execute if this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    await forceE2EDbReset();
    console.log('✅ E2E database force reset complete');
}
