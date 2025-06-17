/**
 * Data Cleanup Service
 * 
 * Handles selective clearing of seed data while preserving real user data
 * Uses identification patterns to distinguish seed data from production data
 */

const { sequelize, Club, User, ClubPlayer, CarnivalClubPlayer, Carnival, Sponsor, ClubSponsor, CarnivalSponsor, CarnivalClub, EmailSubscription, ClubAlternateName, SyncLog } = require('../../models');
const { SAMPLE_CLUBS } = require('../fixtures/clubFixtures');
const { SAMPLE_CARNIVALS } = require('../fixtures/carnivalFixtures');
const { SAMPLE_SPONSORS } = require('../fixtures/sponsorFixtures');
const { validateEnvironment } = require('./environmentValidationService');

class DataCleanupService {
    /**
     * Selective database clearing - only removes seed data and related records
     * Preserves real user data by identifying seed patterns and markers
     * @returns {Promise<Object>} Removal statistics
     */
    async clearSeedData() {
        console.log('🧹 Clearing existing SEED data only (preserving real user data)...');
        
        try {
            // Double-check environment before destructive operations
            validateEnvironment();
            
            // Disable foreign key constraints for SQLite during cleanup
            await sequelize.query('PRAGMA foreign_keys = OFF');
            console.log('🔓 Foreign key constraints disabled for cleanup');
            
            // Track what we're removing for reporting
            const removalStats = {
                clubs: 0,
                users: 0,
                players: 0,
                playerAssignments: 0,
                carnivals: 0,
                sponsors: 0,
                clubSponsors: 0,
                carnivalSponsors: 0,
                carnivalClubs: 0,
                emailSubscriptions: 0,
                clubAlternateNames: 0,
                syncLogs: 0
            };

            // 1. Identify and remove seed clubs and their related data
            console.log('  🏢 Identifying seed clubs...');
            const seedClubNames = SAMPLE_CLUBS.map(club => club.name);
            const seedClubs = await Club.findAll({
                where: {
                    [require('sequelize').Op.or]: [
                        { clubName: { [require('sequelize').Op.in]: seedClubNames } },
                        { logoUrl: '/icons/seed.svg' }, // Seed marker
                        { contactEmail: { [require('sequelize').Op.like]: '%@oldmanfooty.au' } } // Test emails
                    ]
                }
            });
            
            const seedClubIds = seedClubs.map(club => club.id);
            console.log(`    Found ${seedClubs.length} seed clubs to remove`);

            // 2. Remove seed player assignments first (foreign key dependencies)
            console.log('  🏃 Removing seed player assignments...');
            if (seedClubIds.length > 0) {
                // Get carnival registrations for seed clubs
                const seedCarnivalClubs = await CarnivalClub.findAll({
                    where: { clubId: { [require('sequelize').Op.in]: seedClubIds } },
                    attributes: ['id']
                });
                const seedCarnivalClubIds = seedCarnivalClubs.map(cc => cc.id);
                
                // Remove player assignments for these registrations
                const removedPlayerAssignments = await CarnivalClubPlayer.destroy({
                    where: { carnivalClubId: { [require('sequelize').Op.in]: seedCarnivalClubIds } }
                });
                removalStats.playerAssignments = removedPlayerAssignments;
                console.log(`    Removed ${removedPlayerAssignments} player assignments`);
            }

            // 3. Remove seed players
            console.log('  🏃 Removing seed players...');
            const removedPlayers = await ClubPlayer.destroy({
                where: { clubId: { [require('sequelize').Op.in]: seedClubIds } }
            });
            removalStats.players = removedPlayers;
            console.log(`    Removed ${removedPlayers} seed players`);

            // 4. Remove seed users (delegates and admin)
            console.log('  👥 Removing seed users...');
            const seedUserConditions = {
                [require('sequelize').Op.or]: [
                    { email: 'admin@oldmanfooty.au' }, // Admin user
                    { clubId: { [require('sequelize').Op.in]: seedClubIds } }, // Club delegates
                    { email: { [require('sequelize').Op.like]: '%@%masters.com.au' } }, // Test delegate emails
                    { email: { [require('sequelize').Op.like]: '%@%mymasters.com.au' } }
                ]
            };
            
            const seedUsers = await User.findAll({ where: seedUserConditions });
            const removedUsers = await User.destroy({ where: seedUserConditions });
            removalStats.users = removedUsers;
            console.log(`    Removed ${removedUsers} seed users`);

            // 5. Remove seed carnivals
            console.log('  🎪 Removing seed carnivals...');
            const seedCarnivalTitles = SAMPLE_CARNIVALS.map(carnival => carnival.title);
            const seedCarnivalConditions = {
                [require('sequelize').Op.or]: [
                    { title: { [require('sequelize').Op.in]: seedCarnivalTitles } },
                    { clubLogoURL: '/icons/seed.svg' }, // Seed marker
                    { organiserContactEmail: { [require('sequelize').Op.like]: '%@%masters.com.au' } }, // Test organizer emails
                    { 
                        // MySideline imported data (if we want to clear it too)
                        isManuallyEntered: false,
                        createdAt: { [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
                    }
                ]
            };

            const seedCarnivals = await Carnival.findAll({ where: seedCarnivalConditions });
            const seedCarnivalIds = seedCarnivals.map(carnival => carnival.id);
            
            // Remove carnival-club relationships first
            const removedCarnivalClubs = await CarnivalClub.destroy({
                where: { carnivalId: { [require('sequelize').Op.in]: seedCarnivalIds } }
            });
            removalStats.carnivalClubs = removedCarnivalClubs;
            
            // Remove carnival-sponsor relationships
            const removedCarnivalSponsors = await CarnivalSponsor.destroy({
                where: { carnivalId: { [require('sequelize').Op.in]: seedCarnivalIds } }
            });
            removalStats.carnivalSponsors = removedCarnivalSponsors;
            
            // Remove the carnivals themselves
            const removedCarnivals = await Carnival.destroy({ where: seedCarnivalConditions });
            removalStats.carnivals = removedCarnivals;
            console.log(`    Removed ${removedCarnivals} seed carnivals and ${removedCarnivalClubs} registrations`);

            // 6. Remove seed sponsors and their relationships
            console.log('  🤝 Removing seed sponsors...');
            const seedSponsorNames = SAMPLE_SPONSORS.map(sponsor => sponsor.sponsorName);
            const seedSponsorConditions = {
                [require('sequelize').Op.or]: [
                    { sponsorName: { [require('sequelize').Op.in]: seedSponsorNames } },
                    { logoUrl: '/icons/seed.svg' }, // Seed marker
                    { contactEmail: { [require('sequelize').Op.like]: '%@%test.com' } }, // Test emails
                    { description: { [require('sequelize').Op.like]: '%Supporting local rugby league communities%' } } // Seed description pattern
                ]
            };

            const seedSponsors = await Sponsor.findAll({ where: seedSponsorConditions });
            const seedSponsorIds = seedSponsors.map(sponsor => sponsor.id);
            
            // Remove club-sponsor relationships first
            const removedClubSponsors = await ClubSponsor.destroy({
                where: { 
                    [require('sequelize').Op.or]: [
                        { sponsorId: { [require('sequelize').Op.in]: seedSponsorIds } },
                        { clubId: { [require('sequelize').Op.in]: seedClubIds } },
                        { notes: { [require('sequelize').Op.like]: '%Seeded relationship%' } } // Seed marker
                    ]
                }
            });
            removalStats.clubSponsors = removedClubSponsors;
            
            // Remove the sponsors themselves
            const removedSponsors = await Sponsor.destroy({ where: seedSponsorConditions });
            removalStats.sponsors = removedSponsors;
            console.log(`    Removed ${removedSponsors} seed sponsors and ${removedClubSponsors} relationships`);

            // 7. Remove seed email subscriptions
            console.log('  📧 Removing seed email subscriptions...');
            const seedEmailConditions = {
                [require('sequelize').Op.or]: [
                    { email: { [require('sequelize').Op.like]: '%@example.com' } }, // Test emails
                    { email: { [require('sequelize').Op.like]: '%@test.com' } }
                ]
            };
            
            const removedSubscriptions = await EmailSubscription.destroy({ where: seedEmailConditions });
            removalStats.emailSubscriptions = removedSubscriptions;
            console.log(`    Removed ${removedSubscriptions} seed email subscriptions`);

            // 8. Remove club alternate names for seed clubs
            console.log('  🔍 Removing seed club alternate names...');
            const removedAlternateNames = await ClubAlternateName.destroy({
                where: { clubId: { [require('sequelize').Op.in]: seedClubIds } }
            });
            removalStats.clubAlternateNames = removedAlternateNames;
            console.log(`    Removed ${removedAlternateNames} alternate names`);

            // 9. Remove seed sync logs (MySideline import logs)
            console.log('  🔄 Removing seed sync logs...');
            const removedSyncLogs = await SyncLog.destroy({
                where: {
                    [require('sequelize').Op.or]: [
                        { operation: 'seed_data_import' },
                        { details: { [require('sequelize').Op.like]: '%seed%' } },
                        { createdAt: { [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Last 24 hours
                    ]
                }
            });
            removalStats.syncLogs = removedSyncLogs;
            console.log(`    Removed ${removedSyncLogs} sync logs`);

            // 10. Finally remove the seed clubs themselves
            console.log('  🏢 Removing seed clubs...');
            const removedClubs = await Club.destroy({
                where: { id: { [require('sequelize').Op.in]: seedClubIds } }
            });
            removalStats.clubs = removedClubs;
            console.log(`    Removed ${removedClubs} seed clubs`);

            // Re-enable foreign key constraints
            await sequelize.query('PRAGMA foreign_keys = ON');
            console.log('🔒 Foreign key constraints re-enabled');
            
            // Display removal summary
            this.displayRemovalSummary(removalStats);
            
            // Verify real data is preserved
            await this.verifyRealDataPreserved();
            
            console.log('✅ Seed data cleared successfully - real user data preserved');
            
            return removalStats;
            
        } catch (error) {
            console.error('❌ Seed data clearing failed:', error.message);
            throw error;
        }
    }

    /**
     * Display removal summary statistics
     * @param {Object} removalStats - Statistics about removed items
     */
    displayRemovalSummary(removalStats) {
        console.log('\n📊 SEED DATA REMOVAL SUMMARY');
        console.log('=' .repeat(40));
        console.log(`🏢 Clubs removed: ${removalStats.clubs}`);
        console.log(`👥 Users removed: ${removalStats.users}`);
        console.log(`🏃 Players removed: ${removalStats.players}`);
        console.log(`🎪 Player assignments removed: ${removalStats.playerAssignments}`);
        console.log(`🎪 Carnivals removed: ${removalStats.carnivals}`);
        console.log(`🤝 Sponsors removed: ${removalStats.sponsors}`);
        console.log(`🔗 Club-sponsor relationships: ${removalStats.clubSponsors}`);
        console.log(`🎪 Carnival-sponsor relationships: ${removalStats.carnivalSponsors}`);
        console.log(`🎟️ Carnival registrations: ${removalStats.carnivalClubs}`);
        console.log(`📧 Email subscriptions: ${removalStats.emailSubscriptions}`);
        console.log(`🔍 Alternate names: ${removalStats.clubAlternateNames}`);
        console.log(`🔄 Sync logs: ${removalStats.syncLogs}`);
        console.log('=' .repeat(40));
    }

    /**
     * Verify that real user data has been preserved after seed data removal
     * @returns {Promise<void>}
     */
    async verifyRealDataPreserved() {
        try {
            const realDataStats = {
                clubs: await Club.count({ where: { isActive: true } }),
                users: await User.count({ where: { isActive: true } }),
                carnivals: await Carnival.count({ where: { isActive: true } }),
                sponsors: await Sponsor.count({ where: { isActive: true } }),
                subscriptions: await EmailSubscription.count({ where: { isActive: true } })
            };
            
            console.log('\n🛡️  REAL DATA PRESERVATION CHECK');
            console.log('=' .repeat(40));
            console.log(`🏢 Real clubs remaining: ${realDataStats.clubs}`);
            console.log(`👥 Real users remaining: ${realDataStats.users}`);
            console.log(`🎪 Real carnivals remaining: ${realDataStats.carnivals}`);
            console.log(`🤝 Real sponsors remaining: ${realDataStats.sponsors}`);
            console.log(`📧 Real subscriptions remaining: ${realDataStats.subscriptions}`);
            console.log('=' .repeat(40));
            
            if (realDataStats.clubs > 0 || realDataStats.users > 0 || realDataStats.carnivals > 0) {
                console.log('✅ Real user data successfully preserved');
            } else {
                console.log('ℹ️  No existing real data found (clean database)');
            }
            
        } catch (error) {
            console.error('⚠️  Could not verify data preservation:', error.message);
        }
    }
}

module.exports = DataCleanupService;