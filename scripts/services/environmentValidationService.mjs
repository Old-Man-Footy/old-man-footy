/**
 * Environment Validation Service
 * 
 * Provides security validation for database seeding operations
 * Prevents accidental seeding on production databases
 */

/**
 * Environment Protection: Prevent running on production databases
 * @throws {Error} If environment is not safe for seeding
 */
function validateEnvironment() {
    const { sequelize } = require('../../models');
    const environment = process.env.NODE_ENV || 'development';
    const dbPath = sequelize.options.storage;
    
    console.log(`🔍 Environment check: ${environment}`);
    console.log(`🗂️  Database path: ${dbPath}`);
    
    // Block production environment completely
    if (environment === 'production') {
        throw new Error('❌ FATAL: Database seeding is FORBIDDEN in production environment');
    }
    
    // Block if database path suggests production
    if (dbPath && dbPath.includes('old-man-footy.db') && !dbPath.includes('dev-') && !dbPath.includes('test-')) {
        throw new Error('❌ FATAL: Database path appears to be production database. Seeding blocked for safety.');
    }
    
    // Only allow specific development/test database names
    const allowedDbNames = [
        'dev-old-man-footy.db',
        'test-old-man-footy.db',
        ':memory:'  // In-memory database for tests
    ];
    
    const isAllowedDb = allowedDbNames.some(name => 
        dbPath === name || dbPath.endsWith(name) || dbPath === ':memory:'
    );
    
    if (!isAllowedDb) {
        throw new Error(`❌ FATAL: Database name not in allowed list. Allowed: ${allowedDbNames.join(', ')}`);
    }
    
    // Require explicit confirmation for seeding
    // Check for --confirm-seed in both process.argv and npm environment variables
    const confirmFlag = process.argv.includes('--confirm-seed') || 
                       process.env.npm_config_confirm_seed === 'true' ||
                       process.env.CONFIRM_SEED === 'true';
    
    if (!confirmFlag) {
        // Provide helpful guidance on the correct syntax
        console.log('');
        console.log('💡 TIP: Use one of these methods to confirm seeding:');
        console.log('   Method 1: npm run seed -- --confirm-seed');
        console.log('   Method 2: CONFIRM_SEED=true npm run seed');
        console.log('   Method 3: node scripts/seed-database.js --confirm-seed');
        console.log('');
        throw new Error('❌ FATAL: Database seeding requires --confirm-seed flag for safety');
    }
    
    console.log('✅ Environment validation passed - seeding authorized');
}

module.exports = { validateEnvironment };