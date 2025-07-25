/**
 * Production Data Purge Script - Remove Seed Data Only
 * 
 * This script removes all development seed data while preserving:
 * - The main administrator account (admin@oldmanfooty.au)
 * - Any User Acceptance Testing (UAT) data
 * - Real production data created by actual users
 * 
 * Safe to run in production environments during transition from UAT to live.
 */

import { sequelize, User, Club, Carnival, EmailSubscription } from '/models/index.mjs';
import { initializeDatabase } from '/config/database.mjs';
import dotenv from 'dotenv';


// Load environment variables
dotenv.config();

/**
 * Seed data identifiers - data matching these patterns will be removed
 */
const SEED_DATA_PATTERNS = {
    // Club names that match our seed data
    clubNames: [
        'Canterbury Bankstown Masters',
        'Parramatta Eels Masters', 
        'Cronulla Sharks Masters',
        'Brisbane Broncos Masters',
        'Gold Coast Titans Masters',
        'North Queensland Cowboys Masters',
        'Melbourne Storm Masters',
        'Geelong Masters Rugby League',
        'Perth Pirates Masters',
        'Fremantle Dockers Masters',
        'Adelaide Rams Masters',
        'Port Adelaide Masters',
        'Hobart Devils Masters',
        'Launceston Lions Masters',
        'Darwin Crocodiles Masters',
        'Canberra Raiders Masters'
    ],
    
    // Email patterns that indicate seed data
    userEmails: [
        /^primary@.*\.com\.au$/,           // Seed delegate emails
        /^delegate@.*\.com\.au$/,          // Secondary delegate emails
        /^.*@(nswmasters|qldmasters|vicmasters|wamasters|samasters|tasmasters|ntmasters|actmasters)\.com\.au$/,
        /^.*@(cronullamasters|geelongmasters|fremantlemasters|portmasters|northerntasmasters)\.com\.au$/
    ],
    
    // Carnival titles from seed data
    carnivalTitles: [
        'NSW Masters Grand Final',
        'Cronulla Beach Masters Tournament',
        'Queensland Masters Carnival',
        'Gold Coast Summer Festival',
        'North Queensland Cowboys Heritage Cup',
        'Victorian Masters Championship',
        'Geelong Waterfront Masters Cup',
        'Perth Masters Festival',
        'Fremantle Dockers Masters Derby',
        'Adelaide Masters Cup',
        'Port Adelaide Heritage Carnival',
        'Tasmania Devils Island Championship',
        'Launceston Lions Northern Cup',
        'Darwin Crocodiles Top End Tournament',
        'Canberra Raiders Capital Cup'
    ],
    
    // Logo URLs that indicate seed data
    logoUrls: ['/icons/seed.svg'],
    
    // Email subscriptions from seed data
    testEmails: [
        'fan1@example.com',
        'fan2@example.com', 
        'fan3@example.com',
        'rugbyfan@gmail.com',
        'masters.supporter@outlook.com'
    ]
};

/**
 * Protected accounts that should never be deleted
 */
const PROTECTED_ACCOUNTS = [
    'admin@oldmanfooty.au'  // Main administrator account
];

class SeedDataPurger {
    constructor() {
        this.stats = {
            clubsRemoved: 0,
            usersRemoved: 0,
            carnivalsRemoved: 0,
            subscriptionsRemoved: 0
        };
    }

    /**
     * Initialize database connection
     */
    async connect() {
        try {
            await initializeDatabase();
            console.log('✅ Database connection established');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Check if a user email matches seed data patterns
     * @param {string} email - User email to check
     * @returns {boolean} - True if email matches seed patterns
     */
    isSeedUserEmail(email) {
        // Never delete protected accounts
        if (PROTECTED_ACCOUNTS.includes(email)) {
            return false;
        }

        // Check against seed email patterns
        return SEED_DATA_PATTERNS.userEmails.some(pattern => {
            if (pattern instanceof RegExp) {
                return pattern.test(email);
            }
            return email === pattern;
        });
    }

    /**
     * Check if a club is seed data
     * @param {Object} club - Club object to check
     * @returns {boolean} - True if club is seed data
     */
    isSeedClub(club) {
        // Check club name against seed data
        if (SEED_DATA_PATTERNS.clubNames.includes(club.clubName)) {
            return true;
        }

        // Check logo URL
        if (club.logoUrl && SEED_DATA_PATTERNS.logoUrls.includes(club.logoUrl)) {
            return true;
        }

        return false;
    }

    /**
     * Check if a carnival is seed data
     * @param {Object} carnival - Carnival object to check
     * @returns {boolean} - True if carnival is seed data
     */
    isSeedCarnival(carnival) {
        // Check title against seed data
        if (SEED_DATA_PATTERNS.carnivalTitles.includes(carnival.title)) {
            return true;
        }

        // Check logo URL
        if (carnival.clubLogoURL && SEED_DATA_PATTERNS.logoUrls.includes(carnival.clubLogoURL)) {
            return true;
        }

        return false;
    }

    /**
     * Remove seed email subscriptions
     */
    async removeSeedEmailSubscriptions() {
        console.log('📧 Removing seed email subscriptions...');
        
        const transaction = await sequelize.transaction();
        
        try {
            const removedCount = await EmailSubscription.destroy({
                where: {
                    email: SEED_DATA_PATTERNS.testEmails
                },
                transaction
            });
            
            this.stats.subscriptionsRemoved = removedCount;
            await transaction.commit();
            
            console.log(`✅ Removed ${removedCount} seed email subscriptions`);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Remove seed carnivals
     */
    async removeSeedCarnivals() {
        console.log('🎪 Identifying and removing seed carnivals...');
        
        const transaction = await sequelize.transaction();
        
        try {
            // Get all carnivals to check individually
            const allCarnivals = await Carnival.findAll({ transaction });
            const seedCarnivals = allCarnivals.filter(carnival => this.isSeedCarnival(carnival));
            const seedCarnivalIds = seedCarnivals.map(c => c.id);
            
            if (seedCarnivalIds.length > 0) {
                await Carnival.destroy({
                    where: { id: seedCarnivalIds },
                    transaction
                });
            }
            
            this.stats.carnivalsRemoved = seedCarnivalIds.length;
            await transaction.commit();
            
            console.log(`✅ Removed ${seedCarnivalIds.length} seed carnivals`);
            
            if (seedCarnivalIds.length > 0) {
                console.log(`   Removed: ${seedCarnivals.map(c => c.title).join(', ')}`);
            }
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Remove seed users (except protected accounts)
     */
    async removeSeedUsers() {
        console.log('👥 Identifying and removing seed users...');
        
        const transaction = await sequelize.transaction();
        
        try {
            // Get all users to check individually
            const allUsers = await User.findAll({ transaction });
            const seedUsers = allUsers.filter(user => this.isSeedUserEmail(user.email));
            const seedUserIds = seedUsers.map(u => u.id);
            
            if (seedUserIds.length > 0) {
                await User.destroy({
                    where: { id: seedUserIds },
                    transaction
                });
            }
            
            this.stats.usersRemoved = seedUserIds.length;
            await transaction.commit();
            
            console.log(`✅ Removed ${seedUserIds.length} seed users`);
            
            if (seedUserIds.length > 0) {
                console.log(`   Removed: ${seedUsers.map(u => u.email).join(', ')}`);
            }
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Remove seed clubs
     */
    async removeSeedClubs() {
        console.log('🏢 Identifying and removing seed clubs...');
        
        const transaction = await sequelize.transaction();
        
        try {
            // Get all clubs to check individually
            const allClubs = await Club.findAll({ transaction });
            const seedClubs = allClubs.filter(club => this.isSeedClub(club));
            const seedClubIds = seedClubs.map(c => c.id);
            
            if (seedClubIds.length > 0) {
                await Club.destroy({
                    where: { id: seedClubIds },
                    transaction
                });
            }
            
            this.stats.clubsRemoved = seedClubIds.length;
            await transaction.commit();
            
            console.log(`✅ Removed ${seedClubIds.length} seed clubs`);
            
            if (seedClubIds.length > 0) {
                console.log(`   Removed: ${seedClubs.map(c => c.clubName).join(', ')}`);
            }
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Generate summary of remaining data
     */
    async generateSummary() {
        const remainingStats = {
            clubs: await Club.count({ where: { isActive: true } }),
            users: await User.count({ where: { isActive: true } }),
            carnivals: await Carnival.count({ where: { isActive: true } }),
            subscriptions: await EmailSubscription.count({ where: { isActive: true } })
        };

        console.log('\n📊 SEED DATA PURGE SUMMARY');
        console.log('=' .repeat(50));
        console.log('REMOVED:');
        console.log(`👥 Users: ${this.stats.usersRemoved}`);
        console.log(`🏢 Clubs: ${this.stats.clubsRemoved}`);
        console.log(`🎪 Carnivals: ${this.stats.carnivalsRemoved}`);
        console.log(`📧 Email Subscriptions: ${this.stats.subscriptionsRemoved}`);
        console.log('\nREMAINING IN DATABASE:');
        console.log(`👥 Users: ${remainingStats.users}`);
        console.log(`🏢 Clubs: ${remainingStats.clubs}`);
        console.log(`🎪 Carnivals: ${remainingStats.carnivals}`);
        console.log(`📧 Email Subscriptions: ${remainingStats.subscriptions}`);
        console.log('=' .repeat(50));
        
        // Show protected accounts that were preserved
        const adminUsers = await User.findAll({
            where: { email: PROTECTED_ACCOUNTS },
            attributes: ['email', 'isAdmin']
        });
        
        if (adminUsers.length > 0) {
            console.log('\n🔐 PROTECTED ACCOUNTS PRESERVED:');
            adminUsers.forEach(user => {
                console.log(`   ${user.email} (Admin: ${user.isAdmin})`);
            });
        }
        
        return { removed: this.stats, remaining: remainingStats };
    }

    /**
     * Run the complete purge process
     */
    async purge() {
        console.log('🧹 Starting seed data purge process...\n');
        console.log('⚠️  This will remove all seed data while preserving UAT and production data');
        console.log(`🔐 Protected accounts: ${PROTECTED_ACCOUNTS.join(', ')}`);
        console.log('');
        
        try {
            await this.connect();
            
            // Remove in order to respect foreign key constraints
            await this.removeSeedEmailSubscriptions();
            await this.removeSeedCarnivals();
            await this.removeSeedUsers();
            await this.removeSeedClubs();
            
            await this.generateSummary();
            
            console.log('\n✅ Seed data purge completed successfully!');
            console.log('📝 Your UAT and production data has been preserved.');
            
        } catch (error) {
            console.error('\n❌ Seed data purge failed:', error);
            throw error;
        } finally {
            await sequelize.close();
            console.log('\n🔌 Database connection closed');
        }
    }

    /**
     * Dry run - show what would be removed without actually deleting
     */
    async dryRun() {
        console.log('🔍 DRY RUN - Analyzing seed data (no changes will be made)...\n');
        
        try {
            await this.connect();
            
            // Analyze email subscriptions
            const seedEmails = await EmailSubscription.findAll({
                where: { email: SEED_DATA_PATTERNS.testEmails }
            });
            
            // Analyze carnivals
            const allCarnivals = await Carnival.findAll();
            const seedCarnivals = allCarnivals.filter(carnival => this.isSeedCarnival(carnival));
            
            // Analyze users
            const allUsers = await User.findAll();
            const seedUsers = allUsers.filter(user => this.isSeedUserEmail(user.email));
            
            // Analyze clubs
            const allClubs = await Club.findAll();
            const seedClubs = allClubs.filter(club => this.isSeedClub(club));
            
            console.log('📊 SEED DATA ANALYSIS (DRY RUN)');
            console.log('=' .repeat(50));
            console.log(`📧 Email Subscriptions to remove: ${seedEmails.length}`);
            console.log(`🎪 Carnivals to remove: ${seedCarnivals.length}`);
            console.log(`👥 Users to remove: ${seedUsers.length}`);
            console.log(`🏢 Clubs to remove: ${seedClubs.length}`);
            
            if (seedUsers.length > 0) {
                console.log('\nSeed users that would be removed:');
                seedUsers.forEach(user => console.log(`  - ${user.email}`));
            }
            
            if (seedClubs.length > 0) {
                console.log('\nSeed clubs that would be removed:');
                seedClubs.forEach(club => console.log(`  - ${club.clubName}`));
            }
            
            console.log('\n🔐 Protected accounts (will NOT be removed):');
            PROTECTED_ACCOUNTS.forEach(email => console.log(`  - ${email}`));
            
            console.log('\n💡 Run with --execute flag to perform actual purge');
            
        } catch (error) {
            console.error('\n❌ Dry run failed:', error);
            throw error;
        } finally {
            await sequelize.close();
        }
    }
}

/**
 * Run purger based on command line arguments
 */
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    const args = process.argv.slice(2);
    const execute = args.includes('--execute');
    
    const purger = new SeedDataPurger();
    
    const operation = execute ? purger.purge() : purger.dryRun();
    
    operation
        .then(() => {
            if (execute) {
                console.log('\n🎉 Seed data purge completed successfully!');
            } else {
                console.log('\n🎉 Dry run completed successfully!');
            }
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Operation failed:', error);
            process.exit(1);
        });
}

export default SeedDataPurger;